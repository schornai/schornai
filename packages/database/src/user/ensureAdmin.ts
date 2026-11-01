import type { SupabaseClient } from "../_shared/_types";
import { isAdmin } from "./isAdmin";

export async function ensureAdmin({ supabase }: { supabase: SupabaseClient }) {
  const admin = await isAdmin({ supabase });
  if (!admin) {
    throw new Error("User is not an admin");
  }
}
