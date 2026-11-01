import { getServiceFixture } from "../../../service-fixtures";
export const getWorkspaceClaims = async () =>
  getServiceFixture("getWorkspaceClaims", {
    claims: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        createdAt: new Date("2026-01-15T12:00:00.000Z"),
        name: "Beispiel",
        description: "Eine Beschreibung für Storybook.",
        documentation: "Beispiel",
        autoJoin: false,
        samlMappingUser: "Beispiel",
        samlMappingEditor: "Beispiel",
        samlMappingWorkspaceAdmin: "Beispiel",
        claim: "admin",
      },
    ],
    isAdmin: false,
  });
