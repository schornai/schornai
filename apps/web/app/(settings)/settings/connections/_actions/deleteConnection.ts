"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { deleteConnection as deleteConnectionDatabase } from "@schornio/aibox-package-database/connections/deleteConnection";

export const deleteConnection = serverActionClient
  .inputSchema(z.object({ id: z.uuid() }))
  .action(async ({ parsedInput: { id } }) => {
    const supabase = await saveCreateSupabaseServiceRoleClient();
    await deleteConnectionDatabase(id, { supabase });
    revalidatePath("/settings/connections");
    return { id };
  });
