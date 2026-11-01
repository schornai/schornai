"use server";

import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { documentRepositorySchema } from "@schornio/aibox-package-database/documentRepositories/_schema";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { updateDocumentRepository as updateDocumentRepositoryDatabase } from "@schornio/aibox-package-database/documentRepositories/updateDocumentRepository";
import { z } from "zod/mini";

export const updateDocumentRepository = serverActionClient
  .inputSchema(z.object({ documentRepository: documentRepositorySchema }))
  .action(async ({ parsedInput: { documentRepository } }) => {
    const supabase = await createSupabaseServerClient();
    await updateDocumentRepositoryDatabase(documentRepository, { supabase });
    revalidatePath("/");
  });
