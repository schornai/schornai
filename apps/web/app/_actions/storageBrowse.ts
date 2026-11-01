"use server";
import { getWorkspaces } from "@schornio/aibox-package-database/workspace/getWorkspaces";
import { z } from "zod/mini";
import { serverActionClient } from "@/lib/serverActionClient";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getDocumentRepositories } from "@schornio/aibox-package-database/documentRepositories/getDocumentRepositories";
import { getCurrentUserClaims } from "@schornio/aibox-package-database/user/getCurrentUserClaims";
import { requireStorageAccess } from "@schornio/aibox-package-database/storage/requireStorageAccess";
import { storageSchema } from "@schornio/aibox-package-database/storage/_schemas";
import { validateStoragePath } from "@schornio/aibox-package-database/storage/validatePath";
import { StorageSession } from "@schornio/aibox-package-database/storage/_utils/StorageSession";
import { list } from "@schornio/aibox-package-database/storage/list";

export const storageBrowse = serverActionClient
  .inputSchema(
    z.object({
      storage: z.optional(storageSchema),
      path: z.string(),
      mode: z.enum(["read", "write"]),
    }),
  )
  .action(async ({ parsedInput: { storage, path, mode } }) => {
    const supabase = await createSupabaseServerClient();
    if (!storage) {
      const [repositories, claims, workspaces] = await Promise.all([
        getDocumentRepositories({ supabase }),
        getCurrentUserClaims({ supabaseAuth: supabase.auth }),
        getWorkspaces({ supabase }),
      ]);
      return {
        repositories: repositories
          .filter(
            (repo) =>
              mode === "read" ||
              claims === "admin" ||
              claims.some(
                (claim) =>
                  claim.organization_id === repo.workspaceId &&
                  ["editor", "workspace-admin", "admin"].includes(claim.role),
              ),
          )
          .map((repo) => ({
            name: repo.name,
            workspaceName:
              workspaces.find((workspace) => workspace.id === repo.workspaceId)
                ?.name ?? "",
            workspaceId: repo.workspaceId,
            id: repo.id,
          })),
        files: [],
      };
    }
    await requireStorageAccess(storage, mode, { supabase });
    const folder = validateStoragePath(path, { allowRoot: true });
    const files = await list(
      folder,
      new StorageSession({ storage, supabaseStorage: supabase.storage }),
    );
    return { repositories: [], files };
  });
