import type { SupabaseClient } from "../_shared/_types.ts";

export async function getCurrentUser({
  supabaseAuth,
}: {
  supabaseAuth: SupabaseClient["auth"];
}) {
  const {
    data: { user },
    error,
  } = await supabaseAuth.getUser();

  if (error) throw error;

  if (!user) {
    throw new Error("No current user (user is not signed in)");
  }

  return user;
}
