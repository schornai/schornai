import { z } from "zod";
import { streamResourceArchive } from "xrag/resourceArchive";
import { identifierFileName } from "xrag/identifier";
import { resourceKindSchema } from "xrag/schema";
import { getResourceExport } from "@schornio/aibox-package-database/xrag/getResourceExport";
import { fetchXRAGDownload } from "@schornio/aibox-package-database/xrag/fetchXRAGDownload";
import { getEnvSafe } from "@schornio/aibox-package-utils/getEnvSafe";
import { getModelExportSource } from "@schornio/aibox-package-database/xrag/getModelExportSource";
import { getArtifactDownloadUrl } from "@schornio/aibox-package-database/xrag/getArtifactDownloadUrl";
import {
  attachmentDisposition,
  storageDownloadResponse,
} from "@/lib/storageDownloadResponse";
import { signedExportSource } from "@/lib/xrag/downloadUrl";
import { getXRAGContext } from "@/lib/xrag/getXRAGContext";

async function modelSource(path: string[]) {
  const [, id, digest] = z
    .tuple([z.literal("model"), z.string().min(1).max(200), z.hash("sha256")])
    .parse(path);
  const options = await getXRAGContext({ selection: { kind: "model", id } });
  const model = await getModelExportSource(id, options);
  // Keep resumed requests bound to the archive chosen in the model info.
  if (model.id !== digest) throw new Error("XRAG_MODEL_ARCHIVE_UNAVAILABLE");
  return {
    url: await getArtifactDownloadUrl(model.path, {
      supabase: options.supabaseServiceRole,
    }),
    name: model.name,
  };
}

async function resourceDownload(request: Request, path: string[]) {
  const [, kind, id] = z
    .tuple([
      z.literal("resource"),
      resourceKindSchema,
      z.string().min(1).max(200),
    ])
    .parse(path);
  const context = await getXRAGContext({ selection: { kind, id } });
  const cancel = new AbortController();
  const signal = AbortSignal.any([request.signal, cancel.signal]);
  const { resource, files } = await getResourceExport(kind, id, {
    ...context,
    signal,
  });
  const chunks = streamResourceArchive(resource, files, { signal });
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const next = await chunks.next();
      if (next.done) controller.close();
      else controller.enqueue(next.value);
    },
    async cancel() {
      cancel.abort();
      await chunks.return(undefined);
    },
  });
  return new Response(body, {
    headers: {
      "Content-Type": "application/x-tar",
      "Content-Disposition": attachmentDisposition(
        `${kind}-${identifierFileName(resource.id)}.xrag.tar`,
      ),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "none",
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    if (path[0] === "resource") return await resourceDownload(request, path);
    const file =
      path[0] === "model"
        ? await modelSource(path)
        : signedExportSource(
            path,
            new URL(request.url).searchParams.get("token"),
            getEnvSafe("SUPABASE_URL"),
          );
    const response = await storageDownloadResponse(
      request,
      file.url,
      fetchXRAGDownload,
    );
    if (response.ok)
      response.headers.set(
        "Content-Disposition",
        attachmentDisposition(file.name),
      );
    return response;
  } catch {
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
