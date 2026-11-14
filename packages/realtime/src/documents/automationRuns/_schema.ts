import type { Doc } from "yjs";

export function getAutomationRunsUpdates(document: Doc) {
  return document.getMap<string>("automationRunUpdates");
}
