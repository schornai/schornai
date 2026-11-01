"use server";

import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { createTranscriber as createTranscriberDatabase } from "@schornio/aibox-package-database/transcriber/createTranscriber";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { transcriberSchema } from "@schornio/aibox-package-database/transcriber/_schemas";
import { z } from "zod/mini";

export const createTranscriber = serverActionClient
  .inputSchema(z.object({ transcriber: transcriberSchema }))
  .action(async ({ parsedInput: { transcriber } }) => {
    const supabase = await createSupabaseServerClient();
    await createTranscriberDatabase(transcriber, { supabase });
    revalidatePath("/");
    redirect(`/app/transcribe/${transcriber.id}`);
  });
