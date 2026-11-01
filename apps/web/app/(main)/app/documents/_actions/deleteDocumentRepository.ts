"use server";

import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { deleteDocumentRepository as deleteDocumentRepositoryDatabase } from "@schornio/aibox-package-database/documentRepositories/deleteDocumentRepository";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { z } from "zod/mini";

export const deleteDocumentRepository = serverActionClient
  .inputSchema(z.object({ documentRepositoryId: z.string() }))
  .action(async ({ parsedInput: { documentRepositoryId } }) => {
    const supabase = await createSupabaseServerClient();
    await deleteDocumentRepositoryDatabase(documentRepositoryId, { supabase });
    revalidatePath("/");
    redirect(`/app/documents`);
  });
