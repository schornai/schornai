import type { SupabaseClient } from "../_shared/_types.ts";
import type { User } from "./_types.ts";
import { mapUser } from "./_mapper.ts";

export async function getUsers({
  supabaseServiceRole,
}: {
  supabaseServiceRole: SupabaseClient;
}) {
  const {
    data: { users: dbUsers },
  } = await supabaseServiceRole.auth.admin.listUsers();

  const { data: dbUserProfiles } = await supabaseServiceRole
    .from("user_profiles")
    .select()
    .throwOnError();

  const users: User[] = [];

  for (const dbUser of dbUsers) {
    const dbUserProfile = dbUserProfiles?.find(
      (profile) => profile.id === dbUser.id,
    );

    users.push(mapUser(dbUser, dbUserProfile));
  }

  return users;
}
