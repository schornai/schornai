// @vitest-environment jsdom
import "./client-setup";
import { client } from "./client-setup";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AgentIconGroupActions } from "../../apps/web/app/(main)/agent/_components/AgentIconGroupActions";
import { DocumentRepositoryIconGroupActions } from "../../apps/web/app/(main)/app/documents/_components/DocumentRepositoryIconGroupActions";
import { TranscriberIconGroupActions } from "../../apps/web/app/(main)/app/transcribe/_components/TranscriberIconGroupActions";
vi.mock("../../apps/web/app/(main)/_actions/updateFavorite", () => ({
  updateFavorite: vi.fn(),
}));
afterEach(cleanup);
beforeEach(() => client.push.mockClear());
const id = "11111111-1111-4111-8111-111111111111";
const cases = [
  {
    Component: AgentIconGroupActions,
    key: "agent",
    destinations: {
      tooltipEdit: "/agent/entity/edit",
      tooltipInfo: "/agent/entity",
      tooltipNewChat: `/agent/entity/${id}`,
    },
  },
  {
    Component: DocumentRepositoryIconGroupActions,
    key: "documentRepository",
    destinations: {
      tooltipEdit: "/app/documents/entity/edit",
      tooltipInfo: "/app/documents/entity/info",
      Hauptverzeichnis: "/app/documents/entity/files",
    },
  },
  {
    Component: TranscriberIconGroupActions,
    key: "transcriber",
    destinations: {
      tooltipEdit: "/app/transcribe/entity/edit",
      tooltipInfo: "/app/transcribe/entity",
      tooltipNewTranscription: `/app/transcribe/entity/${id}/files`,
      tooltipRecord: `/app/transcribe/entity/${id}/files#record`,
    },
  },
];
for (const { Component, key, destinations } of cases) {
  it(`routes every ${key} action to its entity and gives new activities a fresh id`, () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue(id);
    render(
      <Component
        {...({
          [key]: { id: "entity" },
          workspace: { claim: "workspace-admin" },
        } as any)}
      />,
    );
    for (const [label, path] of Object.entries(destinations)) {
      fireEvent.click(screen.getByRole("button", { name: label }));
      expect(client.push).toHaveBeenLastCalledWith(path);
    }
    expect(client.push).toHaveBeenCalledTimes(Object.keys(destinations).length);
  });
  it(`disables ${key} navigation for an unsaved entity`, () => {
    render(<Component workspace={{ claim: "workspace-admin" } as any} />);
    for (const label of Object.keys(destinations)) {
      const button = screen.getByRole("button", { name: label });
      expect((button as HTMLButtonElement).disabled).toBe(true);
      fireEvent.click(button);
    }
    expect(client.push).not.toHaveBeenCalled();
  });
  it(`hides ${key} editing from ordinary workspace users`, () => {
    render(
      <Component
        {...({ [key]: { id: "entity" }, workspace: { claim: "user" } } as any)}
      />,
    );
    expect(screen.queryByRole("button", { name: "tooltipEdit" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "tooltipInfo" }));
    expect(client.push).toHaveBeenCalledWith(destinations.tooltipInfo);
  });
}
