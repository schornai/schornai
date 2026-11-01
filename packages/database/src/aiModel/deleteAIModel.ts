import type { SupabaseClient } from "../_shared/_types.ts";
/** Server-only: caller must authorize an administrator. Removes the registry entry only, never local model files. */
export async function deleteAIModel(
  id: string,
  { supabase }: { supabase: SupabaseClient },
) {
  try {
    const { data, error } = await supabase
      .from("ai_models")
      .delete()
      .eq("id", id)
      .select("id")
      .single();
    if (error || !data) throw new Error();
  } catch {
    throw new Error("MODEL_DELETE_FAILED");
  }
}
