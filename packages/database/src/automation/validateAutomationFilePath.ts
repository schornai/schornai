import type { AutomationTrigger } from "./_schemas.ts";
import { validateStoragePath } from "../storage/validatePath.ts";

/** Apply the same folder boundary to manual and captured storage events. */
export function validateAutomationFilePath(
  value: string,
  trigger: Extract<AutomationTrigger, { type: "storage" }>,
) {
  const path = validateStoragePath(value);
  const relative = trigger.folder
    ? path.startsWith(`${trigger.folder}/`)
      ? path.slice(trigger.folder.length + 1)
      : ""
    : path;
  if (!relative || (!trigger.includeSubfolders && relative.includes("/")))
    throw new Error("AUTOMATION_FILE_OUTSIDE_SCOPE");
  return path;
}
