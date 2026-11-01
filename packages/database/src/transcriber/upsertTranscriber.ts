import type { Transcriber } from "@/model/transcriber/_types";
import { insertTranscriber } from "@/model/transcriber/insertTranscriber";
import { tryGetTranscriberById } from "@/model/transcriber/tryGetTranscriberById";
import { updateTranscriber } from "@/model/transcriber/updateTranscriber";

export async function upsertTranscriber(
  upsertTranscriber: Partial<Transcriber> & {
    id: Transcriber["id"];
    organizationId: Transcriber["organizationId"];
  },
) {
  const transcriber = await tryGetTranscriberById(upsertTranscriber.id);

  if (transcriber) {
    await updateTranscriber(upsertTranscriber);
    return { mode: "update" as const };
  } else {
    await insertTranscriber(upsertTranscriber);
    return { mode: "insert" as const };
  }
}
