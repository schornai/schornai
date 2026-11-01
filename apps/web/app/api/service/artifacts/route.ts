import { getT, initServerI18next } from "next-i18next/server";
import i18nConfig from "../../../../i18n.config";
import { z } from "zod";
import { authorizeService } from "@/lib/service/authorizeService";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { listArtifacts } from "@schornio/aibox-package-database/xrag/listArtifacts";

export async function GET(request: Request) {
  initServerI18next(i18nConfig);
  const { t } = await getT("settings", { keyPrefix: "service" });
  const headers = { "Cache-Control": "no-store" };
  if (!authorizeService(request))
    return Response.json(
      { error: t("errorUnauthorized") },
      { status: 401, headers },
    );
  const offset = z.coerce
    .number()
    .int()
    .min(0)
    .max(1_000_000)
    .safeParse(new URL(request.url).searchParams.get("offset") ?? 0);
  if (!offset.success)
    return Response.json(
      { error: t("errorRequest") },
      { status: 400, headers },
    );
  try {
    const catalog = await listArtifacts(offset.data, {
      supabase: createSupabaseServiceRoleClient(),
    });
    return Response.json(catalog, { headers });
  } catch {
    return Response.json(
      { error: t("errorCatalog") },
      { status: 503, headers },
    );
  }
}
