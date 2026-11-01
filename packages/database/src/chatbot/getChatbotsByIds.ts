import { cache } from "react";
import { createClient } from "@/supabase/server";
import { mapChatbot } from "./_mappers";

export const getChatbotsByIds = cache(async (chatbotIds: string[]) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chatbots")
    .select("*")
    .in("id", chatbotIds);

  if (error) {
    throw new Error(undefined, { cause: error });
  }

  return data.map(mapChatbot);
});
