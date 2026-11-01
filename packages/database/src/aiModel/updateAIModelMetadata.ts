import type { SupabaseClient } from "../_shared/_types.ts";
/** Server-only: caller must authorize an administrator. */
export async function updateAIModelMetadata(
  input: { id: string; name: string; description: string },
  { supabase }: { supabase: SupabaseClient },
) {
  try {
    const { data, error } = await supabase
      .from("ai_models")
      .update({ name: input.name, description: input.description || null })
      .eq("id", input.id)
      .select("id")
      .single();
    if (error || !data) throw new Error();
    return data.id;
  } catch {
    throw new Error("MODEL_UPDATE_FAILED");
  }
}
