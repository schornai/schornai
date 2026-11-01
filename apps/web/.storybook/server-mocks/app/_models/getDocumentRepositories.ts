import { getServiceFixture } from "../../../service-fixtures";
export const getDocumentRepositories = async () =>
  getServiceFixture("getDocumentRepositories", [
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
  ]);
