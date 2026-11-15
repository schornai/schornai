"use server";
import { serverActionClient } from "@/lib/serverActionClient";
import { automationInputSchema } from "@schornio/aibox-package-database/automation/_schemas";
import { saveAutomation as save } from "@schornio/aibox-package-database/automation/saveAutomation";
import { getAutomationContext } from "../../../../_models/getAutomationContext";
import { revalidatePath } from "next/cache";

export const saveAutomation = serverActionClient
  .inputSchema(automationInputSchema)
  .action(async ({ parsedInput }) => {
    const result = await save(parsedInput, await getAutomationContext());
    revalidatePath("/", "layout");
    return result;
  });
