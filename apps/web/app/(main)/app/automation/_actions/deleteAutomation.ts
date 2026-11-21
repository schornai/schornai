"use server";
import { z } from "zod";
import { serverActionClient } from "@/lib/serverActionClient";
import { deleteAutomation as remove } from "@schornio/aibox-package-database/automation/deleteAutomation";
import { getAutomationContext } from "../../../../_models/getAutomationContext";
import { revalidatePath } from "next/cache";

export const deleteAutomation = serverActionClient
  .inputSchema(z.object({ id: z.uuid() }))
  .action(async ({ parsedInput }) => {
    const result = await remove(parsedInput.id, await getAutomationContext());
    revalidatePath("/", "layout");
    return result;
  });
