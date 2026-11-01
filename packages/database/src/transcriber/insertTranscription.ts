import { createClient } from "@/supabase/server";
import { getCurrentUser } from "@/model/user/getCurrentUser";
import { mapTranscription } from "@/model/transcriber/_mappers";
import { upsertActivity } from "@/model/activity/upsertActivity";

export async function insertTranscription(
  activityId: string,
  transcriberId: string,
) {
  const currentUser = await getCurrentUser();

  const activity = await upsertActivity({
    activityId,
    transcriberId,
    type: "transcribe",
  });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transcriptions")
    .insert({
      id: activity.content.transcriptionId,
      transcriber_id: transcriberId,
      user_id: currentUser.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(undefined, { cause: error });
  }

  return mapTranscription(data);
}
