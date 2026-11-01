import { getServiceFixture } from "../../../../../../service-fixtures";
export const getAgentById = async () =>
  getServiceFixture("getAgentById", {
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
  });
