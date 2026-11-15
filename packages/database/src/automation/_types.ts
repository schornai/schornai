import type { SupabaseClient } from "../_shared/_types.ts";
import type { UserClaims } from "../auth/_types.ts";
import type { AutomationInput } from "./_schemas.ts";
import type { PlatformAccessLevel } from "../mcp/platformAccess.ts";

/** Trusted entry points authenticate userId and claims before supplying a service client. */
export type AutomationOptions = {
  userId: string;
  claims: UserClaims;
  level?: PlatformAccessLevel;
  supabase: SupabaseClient;
  supabaseServiceRole: SupabaseClient;
};
export type Automation = AutomationInput & {
  id: string;
  nextRunAt: string | null;
  createdAt: string;
};

export type AutomationRun = Pick<
  import("../_shared/_types.ts").SupabaseDatabase["public"]["Tables"]["automation_runs"]["Row"],
  | "id"
  | "activity_id"
  | "state"
  | "event"
  | "error_code"
  | "created_at"
  | "finished_at"
>;
