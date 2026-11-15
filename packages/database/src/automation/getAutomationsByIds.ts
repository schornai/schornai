import { z } from "zod";
import type { SupabaseClient } from "../_shared/_types.ts";
import { mapAutomation } from "./_mappers.ts";

/** Use the caller's authenticated client. RLS restricts results to their own
 * automations and requires current editor access, including for favorites. */
export async function getAutomationsByIds(
  ids: string[],
  { supabase }: { supabase: SupabaseClient },
) {
  const validIds = ids.filter((id) => z.uuid().safeParse(id).success);
  if (!validIds.length) return [];
  const { data, error } = await supabase
    .from("automations")
    .select("*")
    .in("id", validIds);
  if (error) throw new Error("AUTOMATION_READ_FAILED");
  return (data ?? []).map(mapAutomation);
}
