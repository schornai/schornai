import type { SupabaseClient } from "../_shared/_types.ts";
import { createUserWithResetKey } from "./createUserWithResetKey.ts";
import { getUserIsAdmin } from "./getUserIsAdmin.ts";
import { hasUsers } from "./hasUsers.ts";

/**
 * Server-only bootstrap for an empty instance. Call only from the local operator
 * CLI using that instance's private credentials, never an unauthenticated route.
 * handle_new_user assigns the first role under a database lock; this operation
 * never promotes an existing user or assigns roles independently of that trigger.
 */
export async function createInitialAdminWithResetKey(
  { email }: { email: string },
  options: { supabaseServiceRole: SupabaseClient },
) {
  if (await hasUsers(options)) throw new Error("INITIAL_ADMIN_EXISTS");
  const created = await createUserWithResetKey({ email }, options);
  try {
    if (!(await getUserIsAdmin(created.userId, options)))
      throw new Error("INITIAL_ADMIN_ROLE_MISSING");
  } catch {
    // A concurrent creator may have won the first-admin role. Remove only our
    // new account, whose random password and reset key have not been delivered.
    const { error } = await options.supabaseServiceRole.auth.admin.deleteUser(
      created.userId,
    );
    if (error) throw new Error("CREATE_USER_CLEANUP_FAILED");
    throw new Error("INITIAL_ADMIN_CREATE_FAILED");
  }
  return created;
}
