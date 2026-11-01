import type {
  Role,
  Workspace,
} from "@schornio/aibox-package-database/workspace/_types";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getCurrentUserClaims } from "@schornio/aibox-package-database/user/getCurrentUserClaims";
import { getWorkspaces } from "./getWorkspaces";

export type WorkspaceClaim = Workspace & { claim?: Role };

export type WorkspaceClaims = {
  claims: WorkspaceClaim[];
  isAdmin: boolean;
};

export const getWorkspaceClaims = cache(async (): Promise<WorkspaceClaims> => {
  const supabase = await createSupabaseServerClient();
  const [claims, workspaces] = await Promise.all([
    getCurrentUserClaims({ supabaseAuth: supabase.auth }),
    getWorkspaces(),
  ]);

  return {
    claims: workspaces.map((org) => ({
      ...org,
      claim:
        claims === "admin"
          ? "admin"
          : claims.find((claim) => claim.organization_id === org.id)?.role,
    })),
    isAdmin: claims === "admin",
  };
});
