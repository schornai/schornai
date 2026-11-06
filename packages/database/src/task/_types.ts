import type { Database } from "../_shared/_supabase.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
export type TaskClaim = Database["public"]["Tables"]["task_claims"]["Row"];
/** Server-only: callers must authenticate a trusted worker/coordinator. */
export type TaskClaimOptions = { supabaseServiceRole: SupabaseClient };
