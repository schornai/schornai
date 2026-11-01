"use server";

import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { transcriberSchema } from "@schornio/aibox-package-database/transcriber/_schemas";
import { updateTranscriber as updateTranscriberDatabase } from "@schornio/aibox-package-database/transcriber/updateTranscriber";
import { z } from "zod/mini";

export const updateTranscriber = serverActionClient
  .inputSchema(z.object({ transcriber: transcriberSchema }))
  .action(async ({ parsedInput: { transcriber } }) => {
    const supabase = await createSupabaseServerClient();
    await updateTranscriberDatabase(transcriber, { supabase });
    revalidatePath("/");
  });
