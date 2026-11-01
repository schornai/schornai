// @vitest-environment jsdom
import "./client-setup";
import { client } from "./client-setup";
import { Doc } from "yjs";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "../../packages/ui/src/components/sidebar";
import {
  ActivityContextProvider,
  useActivites,
  useActivityTypeInfos,
} from "../../apps/web/app/(main)/_components/ActivityContextProvider";
import { SidebarActivitesMenuItem } from "../../apps/web/app/(main)/_components/SidebarActivitesMenuItem";
import {
  SidebarFavoriteItemAgent,
  SidebarFavoriteItemTranscriber,
  SidebarFavoriteItemDocumentRepository,
} from "../../apps/web/app/(main)/_components/SidebarFavoriteItem";
import { AgentInfoRoleDocumentRepository } from "../../apps/web/app/(main)/agent/_components/AgentInfoRoleDocumentRepository";
import { upsertActivity } from "../../packages/realtime/src/documents/activity/upsertActivity";
const mocks = vi.hoisted(() => ({ document: undefined as any }));
vi.mock("@hocuspocus/provider-react", () => ({
  useHocuspocusProvider: () => ({ document: mocks.document }),
}));
vi.mock("../../apps/web/app/(main)/_actions/pinActivity", () => ({
  pinActivity: vi.fn(),
}));
vi.mock("../../apps/web/app/(main)/_actions/deleteActivity", () => ({
  deleteActivity: vi.fn(),
}));
afterEach(cleanup);
beforeEach(() => {
  mocks.document = new Doc();
  client.execute.mockClear();
  client.push.mockClear();
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
});
function State() {
  const activities = useActivites();
  const types = useActivityTypeInfos();
  return (
    <output>
      {JSON.stringify({
        ids: activities.activities.map((item) => item.id),
        pinned: activities.pinnedActivities.map((item) => item.id),
        typeCount: types.size,
      })}
    </output>
  );
}
const types = new Map([["agent", { id: "agent", name: "Agent" }]]) as any;
function wrap(children: any) {
  return render(
    <SidebarProvider>
      <ActivityContextProvider typeInfos={types}>
        {children}
      </ActivityContextProvider>
    </SidebarProvider>,
  );
}
describe("activity navigation and repository mount details", () => {
  it("sorts live activities by recency and updates the pinned list", () => {
    upsertActivity(mocks.document, {
      id: "old",
      updatedAtISO: "2025-01-01",
      pinned: true,
    });
    upsertActivity(mocks.document, { id: "new", updatedAtISO: "2026-01-01" });
    wrap(<State />);
    expect(JSON.parse(screen.getByRole("status").textContent!)).toEqual({
      ids: ["new", "old"],
      pinned: ["old"],
      typeCount: 1,
    });
    act(() => upsertActivity(mocks.document, { id: "new", pinned: true }));
    expect(JSON.parse(screen.getByRole("status").textContent!).pinned).toEqual([
      "new",
      "old",
    ]);
  });
  it("requires the activity provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<State />)).toThrow("outside provider");
    spy.mockRestore();
  });
  it.each([true, false])(
    "pins or unpins an activity currently pinned=%s",
    async (pinned) => {
      wrap(
        <SidebarActivitesMenuItem
          activity={
            {
              id: "activity",
              pinned,
              state: "running",
              label: "Chat label",
              content: { type: "chat", chatbotId: "agent" },
            } as any
          }
        />,
      );
      expect(
        screen.getByRole("link", { name: "Chat label" }).getAttribute("href"),
      ).toBe("/agent/agent/activity");
      fireEvent.click(screen.getByRole("button"));
      const item = await screen.findByRole("menuitem", {
        name: pinned ? "actionUnpin" : "actionPin",
      });
      fireEvent.click(item);
      expect(client.execute).toHaveBeenCalledWith({
        activityId: "activity",
        pinned: !pinned,
      });
    },
  );
  it("deletes activity references and creates a new chat from its menu", async () => {
    wrap(
      <SidebarActivitesMenuItem
        activity={
          {
            id: "activity",
            label: "Chat",
            content: { type: "chat", chatbotId: "agent" },
          } as any
        }
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "actionDelete" }),
    );
    expect(client.execute).toHaveBeenCalledWith({ activityId: "activity" });
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "actionNewChat" }),
    );
    expect(client.push.mock.lastCall![0]).toMatch(
      /^\/agent\/agent\/[0-9a-f-]{36}$/,
    );
  });
  it("links transcription activities to their files", () => {
    wrap(
      <SidebarActivitesMenuItem
        activity={
          {
            id: "activity",
            label: "Audio",
            content: { type: "transcription", transcriberId: "transcriber" },
          } as any
        }
      />,
    );
    expect(
      screen.getByRole("link", { name: "Audio" }).getAttribute("href"),
    ).toBe("/app/transcribe/transcriber/activity/files");
  });
  it("opens agent and transcriber favorites and links repositories", () => {
    const props = { id: "entity", name: "Favorite" } as any;
    const view = render(
      <SidebarProvider>
        <SidebarFavoriteItemAgent agent={props} />
      </SidebarProvider>,
    );
    fireEvent.click(screen.getByText("Favorite"));
    expect(client.push.mock.lastCall![0]).toMatch(/^\/agent\/entity\//);
    view.rerender(
      <SidebarProvider>
        <SidebarFavoriteItemTranscriber transcriber={props} />
      </SidebarProvider>,
    );
    fireEvent.click(screen.getByText("Favorite"));
    expect(client.push.mock.lastCall![0]).toMatch(
      /^\/app\/transcribe\/entity\/.*\/files$/,
    );
    view.rerender(
      <SidebarProvider>
        <SidebarFavoriteItemDocumentRepository documentRepository={props} />
      </SidebarProvider>,
    );
    expect(view.container.querySelector("a")!.getAttribute("href")).toBe(
      "/app/documents/entity/files",
    );
    view.rerender(
      <SidebarProvider>
        <SidebarFavoriteItemAgent />
        <SidebarFavoriteItemTranscriber />
        <SidebarFavoriteItemDocumentRepository />
      </SidebarProvider>,
    );
    expect(view.container.textContent).toBe("");
  });
  it("sorts and expands repository mounts with missing repositories and every permission", () => {
    const mounts = [
      {
        id: "a",
        documentRepositoryIdentifier: "repo",
        mount: "/docs",
        pathRepository: "/b",
        permission: "read-only",
      },
      {
        id: "b",
        documentRepositoryIdentifier: "repo",
        mount: "/docs",
        pathRepository: "/a",
        permission: "write",
      },
      {
        id: "c",
        documentRepositoryIdentifier: "repo",
        mount: "/other",
        pathRepository: "/",
        permission: "confirm-write",
      },
      {
        id: "d",
        documentRepositoryIdentifier: "missing",
        mount: "/",
        pathRepository: "/",
        permission: "read-only",
      },
      {
        id: "e",
        documentRepositoryIdentifier: "repo2",
        mount: "/",
        pathRepository: "/",
        permission: "read-only",
      },
    ] as any;
    render(
      <AgentInfoRoleDocumentRepository
        documentRepositoryMounts={mounts}
        documentRepositoryMap={
          new Map([
            ["repo", { name: "Beta" }],
            ["repo2", { name: "Alpha" }],
          ]) as any
        }
        editRoleId="role"
        editAgentPathname="/edit"
        editDefaultRole={{ documentRepositoryMounts: [] } as any}
      />,
    );
    expect(screen.getByText("labelChanged")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "labelTitle" }));
    expect(screen.getByText("descriptionRepositoryNotFound")).toBeTruthy();
    expect(screen.getByText("labelWrite")).toBeTruthy();
    expect(screen.getByText("labelConfirmWrite")).toBeTruthy();
    expect(screen.getAllByText("labelReadOnly")).toHaveLength(3);
  });
});

import { SidebarNewChat } from "../../apps/web/app/(main)/_components/SidebarNewChat";
import { SidebarActivitesRealtime } from "../../apps/web/app/(main)/_components/SidebarActivitesRealtime";
it("creates a chat for the current agent and hides the action on unrelated routes", () => {
  client.pathname = "/agent/agent/activity";
  const view = wrap(<SidebarNewChat />);
  fireEvent.click(screen.getByRole("button", { name: "labelNewChat" }));
  expect(client.push.mock.lastCall![0]).toMatch(
    /^\/agent\/agent\/[0-9a-f-]{36}$/,
  );
  client.pathname = "/settings";
  view.rerender(
    <SidebarProvider>
      <ActivityContextProvider typeInfos={types}>
        <SidebarNewChat />
      </ActivityContextProvider>
    </SidebarProvider>,
  );
  expect(screen.queryByText("labelNewChat")).toBeNull();
});
it.each([true, false])(
  "renders and expands live activity history populated=%s",
  (populated) => {
    if (populated) {
      const now = Date.now();
      for (const [id, days] of [
        ["Today", 0],
        ["Week", 3],
        ["Month", 15],
      ] as const)
        upsertActivity(mocks.document, {
          id,
          label: id,
          updatedAtISO: new Date(now - days * 86400000).toISOString(),
          pinned: days === 0,
          content: { type: "chat", chatbotId: "agent" },
        });
    }
    wrap(<SidebarActivitesRealtime />);
    fireEvent.click(screen.getByRole("button", { name: "labelLast7Days" }));
    fireEvent.click(screen.getByRole("button", { name: "labelLast30Days" }));
    if (populated) {
      expect(screen.getByRole("link", { name: "Week" })).toBeTruthy();
      expect(screen.getByRole("link", { name: "Month" })).toBeTruthy();
      expect(screen.getAllByRole("link", { name: "Today" })).toHaveLength(2);
    } else expect(screen.getAllByText("labelEmpty")).toHaveLength(3);
  },
);
