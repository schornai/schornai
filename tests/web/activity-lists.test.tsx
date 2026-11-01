// @vitest-environment jsdom
import "./client-setup";
import { client } from "./client-setup";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ActivityListList } from "../../apps/web/app/(main)/activity/_components/ActivityListList";
import { ActivityListTable } from "../../apps/web/app/(main)/activity/_components/ActivityListTable";
import { NO_GROUP_KEY } from "../../apps/web/lib/groupSortView/hook";
const list = vi.hoisted(() => ({
  group: "no-group",
  itemGroups: [] as any[],
  types: new Map(),
}));
vi.mock(
  "../../apps/web/app/(main)/activity/_components/ActivityListProvider",
  () => ({ useActivityList: () => list }),
);
vi.mock(
  "../../apps/web/app/(main)/_components/ActivityContextProvider",
  () => ({ useActivityTypeInfos: () => list.types }),
);
vi.mock("../../apps/web/app/(main)/_actions/pinActivity", () => ({
  pinActivity: vi.fn(),
}));
vi.mock("../../apps/web/app/(main)/_actions/deleteActivity", () => ({
  deleteActivity: vi.fn(),
}));
afterEach(cleanup);
const entries = [
  {
    id: "chat",
    label: "Conversation",
    content: { type: "chat", chatbotId: "agent" },
    state: "running",
    pinned: true,
  },
  {
    id: "audio",
    label: "Audio",
    content: { type: "transcription", transcriberId: "transcriber" },
    state: "error",
  },
  {
    id: "index",
    label: "Index",
    content: { type: "reindex", documentRepositoryId: "repo" },
    state: "idle",
  },
].map((item) => ({
  ...item,
  createdAtISO: "2026-01-01T12:00:00Z",
  updatedAtISO: "2026-01-02T12:00:00Z",
}));
for (const Component of [ActivityListList, ActivityListTable]) {
  it(`${Component.name} exposes the empty state`, () => {
    list.itemGroups = [];
    render(<Component />);
    expect(screen.getByText("emptyTitle")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "emptyLabelAgents" })
        .getAttribute("href"),
    ).toBe("/agent");
  });
  it.each(["created", "updated", "pinned", "state", "type", "no-group"])(
    `${Component.name} renders %s groups and actions`,
    (group) => {
      list.group = group;
      const groupIds =
        group === "created" || group === "updated"
          ? ["today", "last7Days", "last30Days", NO_GROUP_KEY]
          : group === "pinned"
            ? ["pinned", NO_GROUP_KEY]
            : group === "state"
              ? ["running", NO_GROUP_KEY]
              : group === "type"
                ? ["chat", "transcription", "reindex", NO_GROUP_KEY]
                : [NO_GROUP_KEY];
      list.itemGroups = groupIds.map((id, index) => [
        id,
        index === 0 ? entries : [],
      ]);
      list.types = new Map([
        ["agent", { name: "Agent" }],
        ["transcriber", { name: "Transcriber" }],
      ]);
      const view = render(<Component />);
      expect(
        screen.getByRole("link", { name: "Conversation" }).getAttribute("href"),
      ).toBe("/agent/agent/chat");
      expect(
        screen.getByRole("link", { name: "Audio" }).getAttribute("href"),
      ).toBe("/app/transcribe/transcriber/audio/files");
      expect(view.container.textContent).toContain("labelReindex");
      fireEvent.click(
        view.container.querySelector("button:has(svg.lucide-pin-off)")!,
      );
      expect(client.execute).toHaveBeenCalledWith({
        activityId: "chat",
        pinned: false,
      });
      fireEvent.click(
        view.container.querySelector("button:has(svg.lucide-pin)")!,
      );
      expect(client.execute).toHaveBeenCalledWith({
        activityId: "audio",
        pinned: true,
      });
      fireEvent.click(
        view.container.querySelector("button:has(svg.lucide-x)")!,
      );
      expect(client.execute).toHaveBeenCalledWith({ activityId: "chat" });
    },
  );
}

import { ActivityList } from "../../apps/web/app/(main)/activity/_components/ActivityList";
it.each(["table", "list", "unknown"])(
  "filters activities in display mode %s",
  (view) => {
    const filter = vi.fn();
    Object.assign(list, {
      view,
      filter: undefined,
      setFilter: filter,
      itemGroups: [],
    });
    const result = render(<ActivityList />);
    fireEvent.change(screen.getByPlaceholderText("placeholderSearch"), {
      target: { value: "query" },
    });
    expect(filter).toHaveBeenCalledWith("query");
    expect(!!result.container.querySelector("table")).toBe(view === "table");
    expect(!!screen.queryByText("emptyTitle")).toBe(view !== "unknown");
  },
);
