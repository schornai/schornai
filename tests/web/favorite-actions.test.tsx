// @vitest-environment jsdom
import "./client-setup";
import { client } from "./client-setup";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentIconGroupActionFavorite } from "../../apps/web/app/(main)/agent/_components/AgentIconGroupActionFavorite";
import { WorkspaceIconGroupActionFavorite } from "../../apps/web/app/(main)/workspace/_components/WorkspaceIconGroupActionFavorite";
import { DocumentRepositoryIconGroupActionFavorite } from "../../apps/web/app/(main)/app/documents/_components/DocumentRepositoryIconGroupActionFavorite";
import { TranscriberIconGroupActionFavorite } from "../../apps/web/app/(main)/app/transcribe/_components/TranscriberIconGroupActionFavorite";
import InputQuery from "../../apps/web/app/(main)/app/documents/[documentRepositoryId]/search/_components/InputQuery";
vi.mock("../../apps/web/app/(main)/_actions/updateFavorite", () => ({
  updateFavorite: vi.fn(),
}));
afterEach(cleanup);
beforeEach(() => {
  client.execute.mockClear();
  client.push.mockClear();
  client.params = new URLSearchParams();
});
for (const [Component, prop, type] of [
  [AgentIconGroupActionFavorite, "agent", "agent"],
  [WorkspaceIconGroupActionFavorite, "workspace", "workspace"],
  [
    DocumentRepositoryIconGroupActionFavorite,
    "documentRepository",
    "documentRepository",
  ],
  [TranscriberIconGroupActionFavorite, "transcriber", "transcriber"],
] as const) {
  describe(`${type} favorites`, () => {
    it.each([
      undefined,
      { version: "favorites-v2", favorites: [{ id: "other", type: "agent" }] },
    ])("adds the entity and preserves existing favorites %j", (favorites) => {
      render(
        <Component {...({ [prop]: { id: "entity" }, favorites } as any)} />,
      );
      fireEvent.click(screen.getByRole("button"));
      expect(client.execute.mock.lastCall![0].favorites).toEqual([
        ...(favorites?.favorites ?? []),
        { id: "entity", type },
      ]);
    });
    it("removes only the selected entity and disables missing entities", () => {
      const view = render(
        <Component
          {...({
            [prop]: { id: "entity" },
            favorites: {
              version: "favorites-v2",
              favorites: [
                { id: "entity", type },
                { id: "other", type },
              ],
            },
          } as any)}
        />,
      );
      fireEvent.click(screen.getByRole("button"));
      expect(client.execute.mock.lastCall![0].favorites).toEqual([
        { id: "other", type },
      ]);
      view.rerender(<Component />);
      expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(
        true,
      );
    });
  });
}
it("searches without discarding unrelated query parameters", () => {
  client.params = new URLSearchParams("query=before&view=table");
  client.pathname = "/search";
  render(<InputQuery />);
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "two words" },
  });
  fireEvent.click(screen.getByRole("button", { name: "labelSearch" }));
  expect(client.push).toHaveBeenCalledWith(
    "/search?query=two+words&view=table",
  );
});

it("does not remove a different favorite type with the same workspace id", () => {
  render(
    <WorkspaceIconGroupActionFavorite
      workspace={{ id: "entity" } as any}
      favorites={{
        version: "favorites-v2",
        showInSidebar: true,
        favorites: [
          { id: "entity", type: "workspace" },
          { id: "entity", type: "agent" },
        ],
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button"));
  expect(client.execute.mock.lastCall![0].favorites).toEqual([
    { id: "entity", type: "agent" },
  ]);
});
