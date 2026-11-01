import type { SupabaseClient } from "../_shared/_types.ts";
import { getChatbots } from "../chatbot/getChatbots.ts";
import { getTranscribers } from "../transcriber/getTranscribers.ts";

export async function getActivityColors({
  supabase,
}: {
  supabase: SupabaseClient;
}) {
  const [chatbots, transcribers] = await Promise.all([
    getChatbots({ supabase }),
    getTranscribers({ supabase }),
  ]);

  const colors = new Map([
    ...chatbots.map((chatbot) => [chatbot.id, chatbot.config.color] as const),
    ...transcribers.map(
      (transcriber) => [transcriber.id, transcriber.config.color] as const,
    ),
  ]);

  return colors;
}
