import { getServiceFixture } from "../../service-fixtures";
import { adaptFixture, scenarioState } from "../../scenario";
export const searchDocuments = async () =>
  getServiceFixture(
    "searchDocuments",
    adaptFixture(
      {
        documentsByKeywords: [
          {
            digest: "Beispiel",
            digestOffset: 1,
            embeddingDistance: 1,
            file: {
              name: "Beispiel",
              path: "/beispiel.txt",
              createdAtISO: "2026-01-15T12:00:00.000Z",
              file: true,
              readableContent: "transcript",
              size: 1,
              type: "text",
              updatedAtISO: "2026-01-15T12:00:00.000Z",
            },
          },
        ],
        documentsBySemantic: [
          {
            digest: "Beispiel",
            digestOffset: 1,
            embeddingDistance: 1,
            file: {
              name: "Beispiel",
              path: "/beispiel.txt",
              createdAtISO: "2026-01-15T12:00:00.000Z",
              file: true,
              readableContent: "transcript",
              size: 1,
              type: "text",
              updatedAtISO: "2026-01-15T12:00:00.000Z",
            },
          },
        ],
      },
      scenarioState.current,
    ),
  );
