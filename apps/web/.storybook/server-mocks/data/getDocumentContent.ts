import { getServiceFixture } from "../../service-fixtures";
import { adaptFixture, scenarioState } from "../../scenario";
export const getDocumentContent = async () =>
  getServiceFixture(
    "getDocumentContent",
    adaptFixture(
      {
        type: "mdc",
        current: "Beispiel",
        versions: [
          {
            changes: [{ action: "add", change: "Beispiel", row: 1 }],
            date: new Date("2026-01-15T12:00:00.000Z"),
            version: 1,
          },
        ],
      },
      scenarioState.current,
    ),
  );
