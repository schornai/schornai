import { getT, initServerI18next } from "next-i18next/server";
import i18nConfig from "../../../../../i18n.config";
import { z } from "zod";
import { authorizeService } from "@/lib/service/authorizeService";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { getArtifact } from "@schornio/aibox-package-database/xrag/getArtifact";
import { getPublishedArtifactStream } from "@schornio/aibox-package-database/xrag/getPublishedArtifactStream";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  initServerI18next(i18nConfig);
  const { t } = await getT("settings", { keyPrefix: "service" });
  const headers = { "Cache-Control": "no-store" };
  if (!authorizeService(request))
    return Response.json(
      { error: t("errorUnauthorized") },
      { status: 401, headers },
    );
  const id = z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .safeParse((await params).id);
  if (!id.success)
    return Response.json(
      { error: t("errorRequest") },
      { status: 400, headers },
    );
  try {
    const supabase = createSupabaseServiceRoleClient();
    const artifact = await getArtifact(id.data, { supabase });
    if (artifact.deletedAt) throw new Error("ARTIFACT_WITHDRAWN");
    const requestedRange = request.headers.get("range");
    let range: { start: number; end: number; size: number } | undefined;
    if (requestedRange) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(requestedRange);
      const start = Number(match?.[1]);
      const end = match?.[2] ? Number(match[2]) : artifact.size - 1;
      if (
        !match ||
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start < 0 ||
        start >= artifact.size ||
        end < start ||
        end >= artifact.size
      )
        return new Response(null, {
          status: 416,
          headers: { ...headers, "Content-Range": `bytes */${artifact.size}` },
        });
      range = { start, end, size: artifact.size };
    }
    const body = await getPublishedArtifactStream(artifact.id, {
      supabase,
      signal: request.signal,
      range,
    });
    return new Response(body, {
      status: range ? 206 : 200,
      headers: {
        ...headers,
        "Content-Type": "application/x-tar",
        "Content-Length": String(
          range ? range.end - range.start + 1 : artifact.size,
        ),
        "Accept-Ranges": "bytes",
        ETag: `"${artifact.id}"`,
        ...(range
          ? {
              "Content-Range": `bytes ${range.start}-${range.end}/${range.size}`,
            }
          : {}),
        "Content-Disposition": `attachment; filename="${artifact.id}.tar"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json(
      { error: t("errorArtifact") },
      { status: 404, headers },
    );
  }
}
