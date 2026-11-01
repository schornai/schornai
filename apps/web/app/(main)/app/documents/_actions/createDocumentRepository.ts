"use server";

import { createDocumentRepository as createDocumentRepositoryDatabase } from "@schornio/aibox-package-database/documentRepositories/createDocumentRepository";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { documentRepositorySchema } from "@schornio/aibox-package-database/documentRepositories/_schema";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { z } from "zod/mini";

export const createDocumentRepository = serverActionClient
  .inputSchema(z.object({ documentRepository: documentRepositorySchema }))
  .action(async ({ parsedInput: { documentRepository } }) => {
    const supabase = await createSupabaseServerClient();
    const { documentRepositoryId } = await createDocumentRepositoryDatabase(
      documentRepository,
      { supabase },
    );
    revalidatePath("/");
    redirect(`/app/documents/${documentRepositoryId}`);
  });
