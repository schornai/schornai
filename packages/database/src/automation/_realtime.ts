import { z } from "zod";

const prefix = "automation_runs___";

export function getAutomationRunsDocumentName(automationId: string) {
  return prefix + z.uuid().parse(automationId);
}

export function parseAutomationRunsDocumentName(name: string) {
  if (!name.startsWith(prefix)) return undefined;
  const id = z.uuid().safeParse(name.slice(prefix.length));
  return id.success ? id.data : undefined;
}
