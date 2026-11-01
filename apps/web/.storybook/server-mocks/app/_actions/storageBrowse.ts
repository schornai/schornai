import { scenarioState } from "../../../scenario";
import { getServiceFixture } from "../../../service-fixtures";
export const storageBrowse = async (input: {
  storage?: unknown;
  path: string;
}) => {
  if (scenarioState.current === "error")
    return { serverError: "Storybook load failed" };
  const files =
    scenarioState.current === "empty"
      ? []
      : input.path
        ? [
            {
              file: true,
              name: "report.txt",
              path: `${input.path}/report.txt`,
              type: "text/plain",
              size: 42,
              createdAtISO: "2026-01-15",
              updatedAtISO: "2026-01-15",
            },
          ]
        : [
            { folder: true, name: "Projekte", path: "Projekte" },
            {
              file: true,
              name: "notes.txt",
              path: "notes.txt",
              type: "text/plain",
              size: 42,
              createdAtISO: "2026-01-15",
              updatedAtISO: "2026-01-15",
            },
          ];
  return getServiceFixture("storageBrowse", {
    data: {
      repositories: [
        {
          id: "repo",
          workspaceId: "workspace",
          name: "Dokumente",
          workspaceName: "Team",
        },
      ],
      files: input.storage ? files : [],
    },
  });
};
