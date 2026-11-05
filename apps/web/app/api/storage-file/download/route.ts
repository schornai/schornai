import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import {
  storageDownloadResponse,
  storageFileResponse,
} from "@/lib/storageDownloadResponse";
import { getFileTextBackup } from "@schornio/aibox-package-database/storage/getFileTextBackup";
import { storageSchema } from "@schornio/aibox-package-database/storage/_schemas";
import { requireStorageAccess } from "@schornio/aibox-package-database/storage/requireStorageAccess";
import { validateStoragePath } from "@schornio/aibox-package-database/storage/validatePath";
import { StorageSession } from "@schornio/aibox-package-database/storage/_utils/StorageSession";
import { inspect } from "@schornio/aibox-package-database/storage/inspect";
import { getDocumentContent } from "@schornio/aibox-package-database/storage/getDocumentContent";
import { transcriptionToText } from "@schornio/aibox-package-database/storage/transcriptionToText";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const storage = storageSchema.parse(
      JSON.parse(params.get("storage") ?? "null"),
    );
    const path = validateStoragePath(params.get("path") ?? "");
    const supabase = await createSupabaseServerClient();
    await requireStorageAccess(storage, "read", { supabase });
    const session = new StorageSession({
      storage,
      supabaseStorage: supabase.storage,
    });
    const target = await inspect(path, session);
    if (!target?.file) return new Response(null, { status: 404 });
    let response: Response;
    let filename = target.name;
    if (params.get("format") === "processed") {
      const content = await getDocumentContent(path, session);
      if (!content) return new Response(null, { status: 404 });
      filename += content.type === "mdc" ? ".md" : ".txt";
      response = new Response(
        content.type === "mdc" ? content.current : transcriptionToText(content),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } },
      );
    } else {
      const backup = await getFileTextBackup(
        session.getStoragePath(path).storagePath,
        {
          storage: session.supabaseStorage,
          signal: request.signal,
        },
      );
      if (backup) {
        if (!backup.blob) return new Response(null, { status: 404 });
        response = await storageFileResponse(new Response(backup.blob));
      } else {
        const { data, error } = await session.supabaseStorage.createSignedUrl(
          session.getStoragePath(path).storagePath,
          60,
        );
        if (error || !data) return new Response(null, { status: 404 });
        response = await storageDownloadResponse(request, data.signedUrl);
      }
    }
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(filename).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16)}`)}`,
    );
    return response;
  } catch {
    return new Response(null, { status: 404 });
  }
}
