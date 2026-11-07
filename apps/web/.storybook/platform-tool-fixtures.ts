import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import { defaultPlatformAgentAccess } from "@schornio/aibox-package-database/mcp/platformAgentPolicy";
export const platformPreviewAgent: Agent = {
  id: "demo-agent",
  name: "Demo-Assistent",
  description: "Beantwortet Fragen zu unseren Beispieldokumenten.",
  workspaceId: "demo-workspace",
  version: "agent-config-version-4",
  color: { type: "color-oklch-hue", oklchHue: 210 },
  icon: { type: "icon-lucide", iconName: "bot" },
  documentation:
    "## Aufgaben\nHilft beim Einstieg und erklärt die internen Abläufe.",
  modelIdentifier: "demo-model",
  modelThinking: "optional-on",
  additionalFunctions: {
    batch: true,
    disappearingChats: true,
    fileUpload: true,
    nightshift: false,
    pursueGoal: false,
  },
  recommendedMessages: [
    {
      id: "example",
      label: "Onboarding",
      message: "Wie läuft das Onboarding ab?",
    },
  ],
  roles: [
    {
      id: "main",
      name: "Assistent",
      prompt: "Nutze die Dokumente und nenne deine Quellen.",
      documentRepositoryMounts: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          documentRepositoryIdentifier: "demo-docs",
          mount: "/wissen",
          pathRepository: "/",
          permission: "read-only",
        },
      ],
      toolPlatformAccess: defaultPlatformAgentAccess,
    },
  ],
};
export const platformPreviewRepository: DocumentRepository = {
  id: "demo-repository",
  name: "Demo-Wissensablage",
  description: "Onboarding und interne Richtlinien.",
  workspaceId: "demo-workspace",
  type: "database-v2",
  identifier: "demo-docs",
  color: { type: "color-oklch-hue", oklchHue: 210 },
  icon: { type: "icon-lucide", iconName: "folder-open" },
  index: { keyword: { active: true }, embedding: { active: false } },
};

export const platformPreviewFile = {
  name: "Dokument.md",
  path: "team/Dokument.md",
  file: true as const,
  readableContent: "text" as const,
  type: "text/markdown",
  size: 2048,
  createdAtISO: "2026-11-07T08:00:00Z",
  updatedAtISO: "2026-11-07T08:00:00Z",
};
