import { getServiceFixture } from "../../service-fixtures";
import { adaptFixture, scenarioState } from "../../scenario";
export const getTranscriberById = async () =>
  getServiceFixture(
    "getTranscriberById",
    adaptFixture(
      {
        id: "11111111-1111-4111-8111-111111111111",
        identifier: "11111111-1111-4111-8111-111111111111",
        name: "Beispiel",
        version: "transcriber-v2",
        workspaceId: "11111111-1111-4111-8111-111111111111",
        color: { oklchHue: 284, type: "color-oklch-hue" },
        description: "Eine Beschreibung für Storybook.",
        icon: { iconName: "bot", type: "icon-lucide" },
        modelIdentifier: "example-model",
        prompt: "Beantworte die Frage verständlich.",
      },
      scenarioState.current,
    ),
  );
