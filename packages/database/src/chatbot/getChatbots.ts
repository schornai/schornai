import type { SupabaseClient } from "../_shared/_types.ts";
import { mapChatbot } from "./_mappers.ts";

export async function getChatbots({ supabase }: { supabase: SupabaseClient }) {
  const { data } = await supabase.from("chatbots").select().throwOnError();
  return data.map(mapChatbot);
}
