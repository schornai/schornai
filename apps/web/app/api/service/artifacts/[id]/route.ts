import { getT, initServerI18next } from "next-i18next/server";
import i18nConfig from "../../../../../i18n.config";
import { z } from "zod";
import { authorizeService } from "@/lib/service/authorizeService";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { getArtifact } from "@schornio/aibox-package-database/xrag/getArtifact";
import { getArtifactStream } from "@schornio/aibox-package-database/xrag/getArtifactStream";

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
    const body = await getArtifactStream(`artifacts/${artifact.id}.tar`, {
      supabase,
      signal: request.signal,
    });
    return new Response(body, {
      headers: {
        ...headers,
        "Content-Type": "application/x-tar",
        "Content-Length": String(artifact.size),
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
