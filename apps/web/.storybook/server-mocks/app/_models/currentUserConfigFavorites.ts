import { getServiceFixture } from "../../../service-fixtures";
import { z } from "zod/mini";
export const settingFavoritesSchema = z.object({
  favorites: z.array(
    z.object({
      id: z.string(),
      type: z.union([
        z.literal("agent"),
        z.literal("transcriber"),
        z.literal("documentRepository"),
        z.literal("workspace"),
      ]),
    }),
  ),
  showInSidebar: z._default(z.boolean(), true),
  version: z.literal("favorites-v2"),
});
export const getCurrentUserConfigFavorites = async () =>
  getServiceFixture("getCurrentUserConfigFavorites", {
    favorites: [{ id: "11111111-1111-4111-8111-111111111111", type: "agent" }],
    showInSidebar: true,
    version: "favorites-v2",
    agents: [
      {
        description: "Eine Beschreibung für Storybook.",
        id: "11111111-1111-4111-8111-111111111111",
        name: "Beispiel",
        workspaceId: "11111111-1111-4111-8111-111111111111",
        additionalFunctions: {
          batch: false,
          disappearingChats: false,
          fileUpload: false,
          nightshift: false,
          pursueGoal: false,
        },
        color: { type: "color-oklch-hue", oklchHue: 284 },
        documentation: "Beispiel",
        icon: { type: "icon-lucide", iconName: "bot" },
        modelIdentifier: "example-model",
        modelThinking: "mandatory-on",
        recommendedMessages: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            message: "Beispiel",
            label: "Beispiel",
          },
        ],
        roles: [
          {
            documentRepositoryMounts: [
              {
                documentRepositoryIdentifier:
                  "11111111-1111-4111-8111-111111111111",
                id: "11111111-1111-4111-8111-111111111111",
                mount: "Beispiel",
                pathRepository: "/",
                permission: "read-only",
              },
            ],
            id: "11111111-1111-4111-8111-111111111111",
            prompt: "Beantworte die Frage verständlich.",
            mcps: [
              {
                headers: {},
                id: "11111111-1111-4111-8111-111111111111",
                type: "http",
                url: "/brand/squared.png",
                name: "Beispiel",
              },
            ],
            modelIdentifierOverride: "11111111-1111-4111-8111-111111111111",
            modelThinkingOverride: "mandatory-on",
            name: "Beispiel",
            roleSelectionHint: "Beispiel",
            toolCalculator: { active: false },
            toolChatAwareness: {
              active: false,
              recommendNextMessages: false,
              updateChatLabel: false,
            },
            toolWebAccess: {
              active: false,
              webFetchAccess: "allow-all",
              webFetchAllowList: ["Beispiel"],
              webFetch: "on",
              webSearch: "on",
            },
          },
        ],
        version: "agent-config-version-4",
      },
    ],
    documentRepositories: [
      {
        type: "database-v2",
        description: "Eine Beschreibung für Storybook.",
        id: "11111111-1111-4111-8111-111111111111",
        name: "Beispiel",
        workspaceId: "11111111-1111-4111-8111-111111111111",
        identifier: "11111111-1111-4111-8111-111111111111",
        color: { type: "color-oklch-hue", oklchHue: 284 },
        icon: { type: "icon-lucide", iconName: "bot" },
        index: {
          embedding: {
            active: false,
            modelIdentifier: "example-model",
            modelVectorSize: 384,
          },
          keyword: { active: false },
        },
        transcriberIdentifier: "11111111-1111-4111-8111-111111111111",
      },
    ],
    transcribers: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        identifier: "11111111-1111-4111-8111-111111111111",
        name: "Beispiel",
        version: "transcriber-v2",
        workspaceId: "11111111-1111-4111-8111-111111111111",
        color: { type: "color-oklch-hue", oklchHue: 284 },
        description: "Eine Beschreibung für Storybook.",
        icon: { type: "icon-lucide", iconName: "bot" },
        modelIdentifier: "example-model",
        prompt: "Beantworte die Frage verständlich.",
      },
    ],
  });
