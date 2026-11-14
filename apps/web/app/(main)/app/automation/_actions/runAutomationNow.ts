"use server";
import { serverActionClient } from "@/lib/serverActionClient";
import { automationRunInputSchema } from "@schornio/aibox-package-database/automation/_schemas";
import { runAutomationNow as run } from "@schornio/aibox-package-database/automation/runAutomationNow";
import { getAutomationContext } from "../../../../_models/getAutomationContext";
import { revalidatePath } from "next/cache";
export const runAutomationNow = serverActionClient
  .inputSchema(automationRunInputSchema)
  .action(async ({ parsedInput }) => {
    const result = await run(parsedInput, await getAutomationContext());
    revalidatePath("/app/automation", "layout");
    return result;
  });
