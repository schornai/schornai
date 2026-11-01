"use server";

import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { deleteTranscriber as deleteTranscriberDatabase } from "@schornio/aibox-package-database/transcriber/deleteTranscriber";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { z } from "zod/mini";

export const deleteTranscriber = serverActionClient
  .inputSchema(z.object({ transcriberId: z.string() }))
  .action(async ({ parsedInput: { transcriberId } }) => {
    const supabase = await createSupabaseServerClient();
    await deleteTranscriberDatabase(transcriberId, { supabase });
    revalidatePath("/");
    redirect(`/app/transcribe`);
  });
