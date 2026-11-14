import type { AutomationInput } from "@schornio/aibox-package-database/automation/_schemas";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import type { Transcriber_new } from "@schornio/aibox-package-database/transcriber/_types";
export const agents: Agent[] = [
  {
    id: "demo-agent",
    name: "Wochenbriefing",
    description:
      "Fasst neue Dokumente zusammen und bereitet deinen Wochenbericht vor.",
    workspaceId: "demo",
    version: "agent-config-version-4",
    color: { type: "color-oklch-hue", oklchHue: 260 },
    icon: { type: "icon-lucide", iconName: "bot" },
    documentation: "",
    modelIdentifier: "demo-model",
    modelThinking: "optional-off",
    recommendedMessages: [],
    roles: [],
    additionalFunctions: {
      batch: false,
      disappearingChats: false,
      fileUpload: true,
      nightshift: false,
      pursueGoal: false,
    },
  },
];
export const repositories: DocumentRepository[] = [
  {
    type: "database-v2",
    id: "demo",
    identifier: "demo",
    name: "Team-Dokumente",
    description: "Berichte, Protokolle und neue Dokumente im Eingang.",
    workspaceId: "demo",
    color: { type: "color-oklch-hue", oklchHue: 150 },
    icon: { type: "icon-lucide", iconName: "folder-open" },
    index: {
      embedding: {
        active: false,
        modelIdentifier: "demo-model",
        modelVectorSize: 384,
      },
      keyword: { active: false },
    },
  },
];
export const transcribers: Transcriber_new[] = [
  {
    version: "transcriber-v2",
    id: "demo-transcriber",
    identifier: "demo-transcriber",
    workspaceId: "demo",
    name: "Gesprächsprotokoll",
    description: "Wandelt Audioaufnahmen in lesbare Protokolle um.",
    color: { type: "color-oklch-hue", oklchHue: 50 },
    icon: { type: "icon-lucide", iconName: "audio-lines" },
    modelIdentifier: "demo-model",
    prompt: "",
  },
];
export const automation: AutomationInput = {
  id: "aac00000-0000-4000-8000-000000000001",
  name: "Wochenbericht",
  description: "Bereitet das wöchentliche Team-Briefing vor.",
  color: { type: "color-oklch-hue", oklchHue: 290 },
  icon: { type: "icon-lucide", iconName: "calendar-clock" },
  agentId: "demo-agent",
  message: "Erstelle einen kurzen Wochenbericht.",
  enabled: true,
  trigger: {
    type: "time",
    schedule: {
      kind: "weekly",
      weekdays: [1, 5],
      time: "09:00",
      timezone: "Europe/Vienna",
    },
  },
};

export const savedAutomation = {
  ...automation,
  id: automation.id!,
  nextRunAt: "2030-01-07T08:00:00Z",
  createdAt: "2030-01-01T00:00:00Z",
};
