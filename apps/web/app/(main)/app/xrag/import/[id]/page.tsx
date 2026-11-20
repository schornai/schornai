import { getPreparedXRAGImport } from "@schornio/aibox-package-database/xrag/getPreparedXRAGImport";
import { getCurrentUser } from "@schornio/aibox-package-database/user/getCurrentUser";
import { notFound } from "next/navigation";
import { z } from "zod";
import { XRAGTransfer } from "../../_components/XRAGTransfer";
import { getWorkspaceClaims } from "../../../../../_models/getWorkspaceClaims";
import { getGroupSortViewPreferences } from "@/lib/groupSortView/model";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getCurrentUserClaims } from "@schornio/aibox-package-database/user/getCurrentUserClaims";
import { requirePlatformAccess } from "@schornio/aibox-package-database/mcp/platformAccess";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createSupabaseServerClient();
  const [claims, user] = await Promise.all([
    getCurrentUserClaims({ supabaseAuth: supabase.auth }),
    getCurrentUser({ supabaseAuth: supabase.auth }),
  ]);
  requirePlatformAccess(claims, "admin", "workspace");
  const [workspaces, preferences, prepared] = await Promise.all([
    getWorkspaceClaims(),
    getGroupSortViewPreferences("/app/xrag/import"),
    getPreparedXRAGImport(id, {
      supabase,
      authenticated: { userId: user.id, claims },
    }),
  ]);
  return (
    <XRAGTransfer
      key={id}
      uploadId={id}
      prepared={prepared}
      preferences={preferences}
      isAdmin={workspaces.isAdmin}
      workspaces={workspaces.claims
        .filter(
          (workspace) =>
            workspace.claim === "admin" ||
            workspace.claim === "workspace-admin",
        )
        .map(({ id, name }) => ({ id, name }))}
    />
  );
}
