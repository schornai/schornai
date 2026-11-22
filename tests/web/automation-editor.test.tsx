// @vitest-environment jsdom
import type { AutomationSchedule } from "@schornio/aibox-package-database/automation/_schemas";
import { SidebarProvider } from "@schornio/aibox-package-ui/components/sidebar";
import { client } from "./client-setup";
import userEvent from "@testing-library/user-event";
import { defaultColors } from "../../apps/web/lib/defaultColors";
import { AutomationFavorite } from "../../apps/web/app/(main)/app/automation/_components/AutomationFavorite";
import { deleteAutomation } from "../../apps/web/app/(main)/app/automation/_actions/deleteAutomation";

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock(
  "../../apps/web/app/(main)/app/automation/_actions/saveAutomation",
  () => ({ saveAutomation: vi.fn() }),
);
vi.mock(
  "../../apps/web/app/(main)/app/automation/_actions/runAutomationNow",
  () => ({ runAutomationNow: vi.fn() }),
);
vi.mock(
  "../../apps/web/app/(main)/app/automation/_actions/deleteAutomation",
  () => ({ deleteAutomation: vi.fn() }),
);
vi.mock("../../apps/web/app/_actions/storageBrowse", () => ({
  storageBrowse: vi.fn(),
}));
import { AutomationEditor } from "../../apps/web/app/(main)/app/automation/_components/AutomationEditor";
import { AutomationList } from "../../apps/web/app/(main)/app/automation/_components/AutomationList";
import { AutomationListProvider } from "../../apps/web/app/(main)/app/automation/_components/AutomationListProvider";
import { AutomationListOptionsDropdown } from "../../apps/web/app/(main)/app/automation/_components/AutomationListOptionsDropdown";
import { AutomationInfo } from "../../apps/web/app/(main)/app/automation/_components/AutomationInfo";
import { AutomationDetailHeader } from "../../apps/web/app/(main)/app/automation/_components/AutomationDetailHeader";
import { AutomationRun } from "../../apps/web/app/(main)/app/automation/_components/AutomationRun";
import { ResourceSlot } from "../../apps/web/app/_components/ResourceSlot";
import { saveAutomation } from "../../apps/web/app/(main)/app/automation/_actions/saveAutomation";
import { storageBrowse } from "../../apps/web/app/_actions/storageBrowse";
import {
  agents,
  repositories,
  transcribers,
  automation,
  savedAutomation,
} from "../../apps/web/stories/(main)/app/automation/fixtures";
import type { AutomationInput } from "@schornio/aibox-package-database/automation/_schemas";
afterEach(cleanup);
beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  client.execute.mockReset();
  client.push.mockClear();
  client.replace.mockClear();
  client.params = new URLSearchParams();
  client.pathname = "/app/automation/new";
  client.pending = false;
  client.actionErrored = false;
});
function editor(initial: AutomationInput | undefined, view: string) {
  client.params = new URLSearchParams({ view });
  const ui = (
    <AutomationEditor
      agents={agents}
      repositories={repositories}
      initial={initial}
    />
  );
  const result = render(ui, { wrapper: SidebarProvider });
  return {
    view: (next: string) => {
      client.params = new URLSearchParams({ view: next });
      result.rerender(
        <AutomationEditor
          agents={agents}
          repositories={repositories}
          initial={initial}
        />,
      );
    },
    submit: () =>
      fireEvent.submit(
        screen
          .getByRole("button", { name: initial ? "labelSave" : "labelCreate" })
          .closest("form")!,
      ),
  };
}
it("keeps the draft across editor tabs and requires an explicit agent before creating", async () => {
  const form = editor(undefined, "settings");
  fireEvent.change(screen.getByLabelText("labelName"), {
    target: { value: "Report" },
  });
  form.view("chat");
  fireEvent.change(screen.getByLabelText("labelMessage"), {
    target: { value: "Summarize" },
  });
  form.submit();
  expect(screen.getByText("errorInvalid")).toBeTruthy();
  expect(client.execute).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /labelChooseResource/ }));
  const dialog = within(await screen.findByRole("dialog"));
  fireEvent.change(dialog.getByRole("textbox"), {
    target: { value: "Wochen" },
  });
  fireEvent.click(dialog.getByRole("button", { name: "labelSelectNamed" }));
  form.submit();
  expect(client.execute).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "Report",
      agentId: "demo-agent",
      message: "Summarize",
    }),
  );
  form.view("default");
  expect(screen.getAllByText("Report").length).toBeGreaterThan(0);
  act(() =>
    client.actionOptionsByAction
      .get(saveAutomation)
      .onSuccess({ data: { id: "new-id" } }),
  );
  expect(client.push).toHaveBeenCalledWith("/app/automation/new-id/info");
});
it("uses distinct trigger cards and compact schedule controls with working calendar rules", () => {
  const form = editor(automation, "trigger");
  fireEvent.click(screen.getByRole("button", { name: "options.interval" }));
  expect(screen.queryByRole("button", { name: "labelDays" })).toBeNull();
  fireEvent.change(screen.getByLabelText("labelIntervalHours"), {
    target: { value: "3" },
  });
  fireEvent.click(screen.getByRole("button", { name: "options.monthly" }));
  fireEvent.change(screen.getByLabelText("labelMonthday"), {
    target: { value: "20" },
  });
  fireEvent.change(screen.getByLabelText("labelTime"), {
    target: { value: "10:30" },
  });
  expect(screen.queryByLabelText("labelTimezone")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /labelTimezone:/ }));
  fireEvent.change(screen.getByLabelText("labelTimezone"), {
    target: { value: "Europe/Vienna" },
  });
  form.submit();
  expect(client.execute).toHaveBeenLastCalledWith(
    expect.objectContaining({
      trigger: {
        type: "time",
        schedule: {
          kind: "monthly",
          day: 20,
          time: "10:30",
          timezone: "Europe/Vienna",
        },
      },
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "options.once" }));
  fireEvent.change(screen.getByLabelText("labelOnce"), {
    target: { value: "2030-01-02T09:00" },
  });
  form.view("default");
  expect(screen.getAllByText(/2030/).length).toBeGreaterThan(0);
  form.view("trigger");
  fireEvent.click(screen.getByRole("button", { name: "options.interval" }));
  fireEvent.click(screen.getByRole("button", { name: "options.weekly" }));
  expect(screen.queryByRole("switch")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "labelEveryWeekday" }));
  const weekdays = screen.getAllByRole("switch");
  expect(weekdays).toHaveLength(7);
  fireEvent.click(weekdays[0]!);
  fireEvent.click(weekdays[1]!);
  form.submit();
  expect(client.execute).toHaveBeenLastCalledWith(
    expect.objectContaining({
      trigger: expect.objectContaining({
        schedule: expect.objectContaining({ weekdays: [3, 4, 5, 6, 0] }),
      }),
    }),
  );
});
it("chooses repository and folder together and reopens the selected folder", async () => {
  vi.mocked(storageBrowse).mockImplementation(
    async (input: any) =>
      ({
        data: {
          repositories: [
            { id: "demo", workspaceId: "demo", name: "Team-Dokumente" },
          ],
          files:
            input.storage && !input.path
              ? [{ folder: true, path: "inbox", name: "inbox" }]
              : [],
        },
      }) as any,
  );
  const form = editor(automation, "trigger");
  fireEvent.click(screen.getByRole("button", { name: /options.storage/ }));
  expect(
    screen.queryByRole("button", { name: /labelChooseResource/ }),
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "labelChooseFolder" }));
  fireEvent.click(await screen.findByRole("button", { name: "inbox" }));
  await screen.findByText("/inbox");
  await waitFor(() =>
    expect(
      (
        screen.getByRole("button", {
          name: "labelUseFolder",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole("button", { name: "labelUseFolder" }));
  await screen.findByRole("button", { name: "Team-Dokumente / inbox" });
  expect(
    screen.queryByRole("switch", { name: "options.processed" }),
  ).toBeNull();
  expect(
    screen.getByRole("button", { name: /labelAttachment/ }).textContent,
  ).toContain("options.copy");
  fireEvent.click(screen.getByRole("button", { name: /labelEvents/ }));
  fireEvent.click(screen.getByRole("switch", { name: "options.processed" }));
  fireEvent.click(screen.getByRole("switch", { name: "options.uploaded" }));
  expect(screen.queryByRole("switch", { name: "labelSubfolders" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /labelStorageOptions/ }));
  fireEvent.click(screen.getByRole("switch", { name: "labelSubfolders" }));
  fireEvent.click(screen.getByRole("button", { name: /labelAttachment/ }));
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox", { name: "labelAttachment" }));
  await user.click(
    await screen.findByRole("option", { name: "options.reference" }),
  );
  form.view("default");
  fireEvent.click(screen.getByRole("switch", { name: "labelEnabled" }));
  form.submit();
  expect(client.execute).toHaveBeenLastCalledWith(
    expect.objectContaining({
      enabled: false,
      trigger: expect.objectContaining({
        folder: "inbox",
        events: ["uploaded"],
        attachment: "reference",
        includeSubfolders: false,
        storage: {
          type: "documentRepository",
          documentRepositoryId: "demo",
          workspaceId: "demo",
        },
      }),
    }),
  );
  form.view("trigger");
  fireEvent.click(
    screen.getByRole("button", { name: "Team-Dokumente / inbox" }),
  );
  expect(
    await screen.findByRole("dialog", { name: "labelChooseFolder" }),
  ).toBeTruthy();
  expect(
    screen.getByText("descriptionFolderScope", {
      selector: "[data-slot=dialog-description]",
    }),
  ).toBeTruthy();
  await waitFor(() =>
    expect(storageBrowse).toHaveBeenCalledWith({
      storage: {
        type: "documentRepository",
        documentRepositoryId: "demo",
        workspaceId: "demo",
      },
      path: "inbox",
      mode: "write",
    }),
  );
});
it("renders cards by default and preserves table search and shared actions", async () => {
  const wrapper = (preferences: any) => (
    <AutomationListProvider
      automations={[savedAutomation]}
      userPreferences={preferences}
    >
      <AutomationListOptionsDropdown />
      <AutomationList />
    </AutomationListProvider>
  );
  const result = render(wrapper({}));
  expect(
    screen.getByRole("button", { name: "labelInfo" }).getAttribute("href"),
  ).toBe(`/app/automation/${automation.id}/info`);
  expect(screen.queryByRole("table")).toBeNull();
  result.rerender(wrapper({ view: "table", group: "trigger" }));
  expect(screen.getByRole("table")).toBeTruthy();
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "missing" },
  });
  expect(await screen.findByText("labelEmpty")).toBeTruthy();
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });
  expect(
    await screen.findByRole("button", { name: "labelRunNow" }),
  ).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "tooltipAddFavorite" }),
  ).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "labelEdit" }).getAttribute("href"),
  ).toBe(`/app/automation/${automation.id}/edit`);
});
it("renders all resource types and clears a filled slot without navigating", () => {
  const change = vi.fn();
  const { rerender } = render(
    <ResourceSlot
      type="transcriber"
      resources={transcribers}
      value="demo-transcriber"
      onChange={change}
    />,
  );
  expect(screen.getByText("Gesprächsprotokoll")).toBeTruthy();
  expect(screen.queryByRole("link")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "labelClearResource" }));
  expect(change).toHaveBeenCalledWith(undefined);
  rerender(
    <ResourceSlot
      type="documentRepository"
      resources={repositories}
      value="missing"
      onChange={change}
      invalid
    />,
  );
  expect(screen.getByText("descriptionUnavailable")).toBeTruthy();
  rerender(<ResourceSlot type="agent" resources={[]} onChange={change} />);
  fireEvent.click(screen.getByRole("button", { name: /labelChooseResource/ }));
  expect(screen.getByText("labelNoResults")).toBeTruthy();
});
it("starts a saved automation and opens its dedicated history after success", () => {
  render(
    <AutomationRun
      automation={{ id: automation.id!, trigger: automation.trigger }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "labelRunNow" }));
  expect(client.execute).toHaveBeenCalledWith({
    id: automation.id,
    requestId: expect.any(String),
  });
  act(() => client.actionOptions.onSuccess());
  expect(client.push).toHaveBeenCalledWith(
    `/app/automation/${automation.id}/runs`,
  );
});
it("asks for a file before manually testing a storage attachment", async () => {
  vi.mocked(storageBrowse).mockResolvedValue({
    data: {
      repositories: [],
      files: [
        {
          file: true,
          path: "inbox/report.pdf",
          name: "report.pdf",
          size: 12,
          type: "application/pdf",
          createdAtISO: "2030-01-01",
          updatedAtISO: "2030-01-01",
        },
      ],
    },
  } as any);
  client.execute.mockResolvedValue({ data: { id: "run" } });
  render(
    <AutomationRun
      automation={{
        id: automation.id!,
        trigger: {
          type: "storage",
          storage: {
            type: "documentRepository",
            documentRepositoryId: "demo",
            workspaceId: "demo",
          },
          folder: "inbox",
          events: ["processed"],
          includeSubfolders: true,
          attachment: "copy",
        },
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "labelRunNow" }));
  expect(client.execute).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByRole("button", { name: "report.pdf" }));
  fireEvent.click(screen.getByRole("button", { name: "labelUseFile" }));
  await waitFor(() =>
    expect(client.execute).toHaveBeenCalledWith({
      id: automation.id,
      requestId: expect.any(String),
      path: "inbox/report.pdf",
    }),
  );
});

it("shows saved details and draft placeholders with section-specific edit links", () => {
  const result = render(
    <AutomationInfo
      automation={automation}
      agents={agents}
      workspace={{ claim: "workspace-admin" } as any}
      showResourceActions
      editable
    />,
  );
  expect(screen.getByRole("button", { name: "labelExport" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "labelAdd" })).toBeTruthy();
  expect(screen.getByText(/09:00 \(Europe\/Vienna\)/)).toBeTruthy();
  expect(
    screen
      .getAllByRole("button", { name: "labelEdit" })
      .map((el) => el.getAttribute("href"))
      .filter((href) => href?.includes("?view=")),
  ).toEqual([
    `/app/automation/${automation.id}/edit?view=default`,
    `/app/automation/${automation.id}/edit?view=trigger`,
    `/app/automation/${automation.id}/edit?view=trigger`,
    `/app/automation/${automation.id}/edit?view=chat`,
    `/app/automation/${automation.id}/edit?view=chat`,
  ]);
  result.rerender(
    <AutomationInfo
      automation={{
        ...automation,
        id: undefined,
        name: "",
        message: "",
        agentId: "",
        enabled: false,
        trigger: { type: "time", schedule: { kind: "once", at: "" } },
      }}
      editable
      preview
      workspace={{ claim: "workspace-admin" } as any}
    />,
  );
  expect(screen.queryByRole("button", { name: "labelExport" })).toBeNull();
  expect(screen.queryByRole("button", { name: "labelAdd" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "labelMessage" }));
  expect(screen.getAllByText("labelNotConfigured")).toHaveLength(3);
  expect(screen.queryByText("descriptionPaused")).toBeNull();
  expect(screen.queryByRole("button", { name: "labelRunNow" })).toBeNull();
  expect(
    screen
      .getAllByRole("button", { name: "labelEdit" })[0]
      ?.getAttribute("href"),
  ).toBe("?view=trigger");
  for (const schedule of [
    { kind: "days", every: 2 },
    {
      kind: "weekly",
      weekdays: [1, 3],
      time: "09:00",
      timezone: "Europe/Vienna",
    },
    { kind: "monthly", day: 15, time: "10:00", timezone: "Europe/Vienna" },
  ] as const) {
    result.rerender(
      <AutomationInfo
        automation={{
          ...automation,
          trigger: {
            type: "time",
            schedule: {
              ...schedule,
              ...(schedule.kind === "weekly"
                ? { weekdays: [...schedule.weekdays] }
                : {}),
            },
          } as AutomationInput["trigger"],
        }}
      />,
    );
    expect(screen.getAllByRole("button", { name: "labelEdit" })).toHaveLength(
      1,
    );
    expect(
      screen.getByText(
        schedule.kind === "weekly"
          ? /09:00 \(Europe\/Vienna\)/
          : `summary.${schedule.kind}`,
      ),
    ).toBeTruthy();
  }
  const trigger = {
    type: "storage",
    storage: {
      type: "documentRepository",
      documentRepositoryId: "demo",
      workspaceId: "demo",
    },
    folder: "inbox",
    events: ["processed"],
    attachment: "reference",
    includeSubfolders: false,
  } as const;
  result.rerender(
    <AutomationInfo
      automation={{
        ...automation,
        trigger: { ...trigger, events: [...trigger.events] },
      }}
      repositories={repositories}
    />,
  );
  expect(screen.getByText(/Team-Dokumente.*inbox/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "labelTrigger" }));
  expect(screen.getByText("labelOnlyFolder")).toBeTruthy();
  expect(screen.getByText("options.reference")).toBeTruthy();
});

it("groups cards by status or initial and removes grouping explicitly", () => {
  const data = [
    savedAutomation,
    {
      ...savedAutomation,
      id: "second",
      name: "Another",
      enabled: false,
      trigger: {
        type: "storage",
        storage: {
          type: "documentRepository",
          documentRepositoryId: "demo",
          workspaceId: "demo",
        },
        folder: "",
        events: ["uploaded"],
        attachment: "none",
        includeSubfolders: true,
      } as AutomationInput["trigger"],
    },
  ];
  const ui = (group: string, view = "cards") => (
    <AutomationListProvider
      automations={data}
      userPreferences={{ group, view }}
    >
      <AutomationList />
    </AutomationListProvider>
  );
  const result = render(ui("status"));
  expect(screen.getByText("options.enabled")).toBeTruthy();
  expect(screen.getByText("options.paused")).toBeTruthy();
  result.rerender(ui("first-letter"));
  expect(screen.getByText("A")).toBeTruthy();
  result.rerender(ui("no-group"));
  expect(screen.queryByText("A")).toBeNull();
  expect(screen.getAllByRole("button", { name: "labelInfo" })).toHaveLength(2);
  result.rerender(ui("status", "table"));
  expect(screen.getByRole("table")).toBeTruthy();
  expect(screen.getAllByText("labelPaused")).toHaveLength(2);
});

it("links info and history to the same automation without a header back button", () => {
  render(<AutomationDetailHeader automation={savedAutomation} view="runs" />, {
    wrapper: SidebarProvider,
  });
  for (const [name, path] of [
    ["labelInfo", "info"],
    ["labelRuns", "runs"],
  ]) {
    expect(screen.getByRole("button", { name }).getAttribute("href")).toBe(
      `/app/automation/${automation.id}/${path}`,
    );
  }
  expect(screen.queryByRole("button", { name: "labelBack" })).toBeNull();
  expect(screen.queryByRole("button", { name: "labelEdit" })).toBeNull();
  expect(screen.queryByRole("button", { name: "labelRunNow" })).toBeNull();
});

it("keeps failed drafts editable, discards changes explicitly and validates missing folders", async () => {
  client.actionErrored = true;
  const form = editor(automation, "settings");
  expect(screen.getByText("errorSave")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("labelName"), {
    target: { value: "Changed" },
  });
  fireEvent.click(screen.getByRole("button", { name: "labelDiscard" }));
  fireEvent.click(
    within(await screen.findByRole("alertdialog")).getByRole("button", {
      name: "labelDiscard",
    }),
  );
  expect((screen.getByLabelText("labelName") as HTMLInputElement).value).toBe(
    automation.name,
  );
  form.view("trigger");
  fireEvent.click(screen.getByRole("button", { name: /options.storage/ }));
  form.submit();
  expect(client.execute).not.toHaveBeenCalled();
  expect(client.push).toHaveBeenLastCalledWith("?view=trigger");
  expect(screen.getByText("errorInvalid")).toBeTruthy();
});

it("changes view, sorting and grouping through Options and saves or resets preferences", async () => {
  client.pathname = "/app/automation";
  const result = render(
    <AutomationListProvider
      automations={[savedAutomation]}
      userPreferences={{}}
    >
      <AutomationListOptionsDropdown />
    </AutomationListProvider>,
  );
  const open = async (label: string) => {
    if (!screen.queryByRole("menuitem", { name: "labelGroup" }))
      fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
    const menu = await screen.findByRole("menuitem", { name: label });
    fireEvent.keyDown(menu, { key: "ArrowRight" });
  };
  await open("labelView");
  fireEvent.click(
    await screen.findByRole("menuitemradio", { name: "labelTable" }),
  );
  expect(client.push).toHaveBeenLastCalledWith("/app/automation?view=table");
  await open("labelSort");
  fireEvent.click(
    await screen.findByRole("menuitemradio", { name: "labelNameDesc" }),
  );
  expect(client.push).toHaveBeenLastCalledWith(
    "/app/automation?sort=name%3Adesc",
  );
  await open("labelGroup");
  fireEvent.click(
    await screen.findByRole("menuitemradio", { name: "labelStatus" }),
  );
  expect(client.push).toHaveBeenLastCalledWith("/app/automation?group=status");
  client.params = new URLSearchParams({ view: "table", group: "status" });
  result.rerender(
    <AutomationListProvider
      automations={[savedAutomation]}
      userPreferences={{}}
    >
      <AutomationListOptionsDropdown />
    </AutomationListProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "labelSaveView" }));
  expect(client.execute).toHaveBeenCalledWith({
    id: "/app/automation",
    preferences: { view: "table", group: "status", sort: "name:asc" },
  });
  fireEvent.click(screen.getByRole("button", { name: "labelReset" }));
  expect(client.push).toHaveBeenLastCalledWith("/app/automation");
  fireEvent.click(screen.getByRole("menuitem", { name: "labelNew" }));
  expect(client.push).toHaveBeenLastCalledWith("/app/automation/new");
});

it("routes invalid fields to their editor section and permits correcting an empty one-time date", () => {
  const form = editor(undefined, "settings");
  form.submit();
  expect(client.push).toHaveBeenLastCalledWith("?view=settings");
  fireEvent.change(screen.getByLabelText("labelName"), {
    target: { value: "Test" },
  });
  form.view("trigger");
  fireEvent.click(screen.getByRole("button", { name: "options.once" }));
  fireEvent.change(screen.getByLabelText("labelOnce"), {
    target: { value: "" },
  });
  expect((screen.getByLabelText("labelOnce") as HTMLInputElement).value).toBe(
    "",
  );
  form.view("chat");
  fireEvent.click(screen.getByRole("button", { name: /labelChooseResource/ }));
  fireEvent.click(screen.getByRole("button", { name: "labelSelectNamed" }));
  fireEvent.change(screen.getByLabelText("labelMessage"), {
    target: { value: "Test message" },
  });
  form.submit();
  expect(client.push).toHaveBeenLastCalledWith("?view=trigger");
  fireEvent.click(screen.getByRole("button", { name: "labelClearResource" }));
  expect(
    screen.getByRole("button", { name: /labelChooseResource/ }),
  ).toBeTruthy();
  act(() =>
    client.actionOptionsByAction
      .get(saveAutomation)
      .onSuccess({ data: undefined }),
  );
  expect(client.push).not.toHaveBeenCalledWith(
    expect.stringContaining("/info"),
  );
});

it("can re-enable a paused definition and switch back from file to time scheduling", () => {
  const form = editor({ ...automation, enabled: false }, "default");
  expect(screen.getByText("descriptionPaused")).toBeTruthy();
  fireEvent.click(screen.getByRole("switch", { name: "labelEnabled" }));
  expect(screen.getByText("descriptionEnabled")).toBeTruthy();
  form.view("settings");
  expect(screen.queryByRole("switch", { name: "labelEnabled" })).toBeNull();
  fireEvent.change(screen.getByLabelText("labelName"), {
    target: { value: "" },
  });
  expect(screen.getByText("labelAutomation")).toBeTruthy();
  form.view("trigger");
  fireEvent.click(screen.getByRole("button", { name: /options.storage/ }));
  fireEvent.click(screen.getByRole("button", { name: /options.time/ }));
  expect(screen.getByLabelText("labelTime")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "labelEveryWeekday" }),
  ).toBeTruthy();
});

it("disables creating without agents and shows the configured status while a save is pending", () => {
  client.params = new URLSearchParams({ view: "settings" });
  client.pending = true;
  const result = render(<AutomationEditor agents={[]} />, {
    wrapper: SidebarProvider,
  });
  expect(
    (screen.getByRole("button", { name: "labelCreate" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(
    (screen.getByLabelText("labelName") as HTMLInputElement).closest("fieldset")
      ?.disabled,
  ).toBe(true);
  result.rerender(
    <AutomationEditor
      agents={[]}
      initial={{ ...automation, enabled: false }}
    />,
  );
  expect(
    (screen.getByRole("button", { name: "labelSave" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});

it("describes storage scopes even when a repository is unavailable or the source is a chat", () => {
  const trigger = {
    type: "storage",
    storage: {
      type: "documentRepository",
      documentRepositoryId: "missing",
      workspaceId: "demo",
    },
    events: ["uploaded"],
    folder: "",
    includeSubfolders: true,
    attachment: "none",
  } as const;
  const result = render(
    <AutomationInfo
      automation={{
        ...automation,
        trigger: { ...trigger, events: [...trigger.events] },
      }}
    />,
  );
  expect(screen.getByText(/labelNotConfigured.*·/)).toBeTruthy();
  expect(screen.getByText("labelOnFileEvent")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "labelTrigger" }));
  expect(screen.getByText("labelSubfolders")).toBeTruthy();
  result.rerender(
    <AutomationInfo
      automation={{
        ...automation,
        trigger: {
          ...trigger,
          events: [...trigger.events],
          storage: {
            type: "activity",
            agentId: "demo",
            activityId: "chat",
          },
        } as AutomationInput,
      }}
    />,
  );
  expect(screen.getByText(/labelFolder.*·/)).toBeTruthy();
});

it("renders the shared table with its next execution column and hides preference actions once saved", async () => {
  const preferences = {
    sort: "name:asc",
    view: "table",
    group: "first-letter",
  };
  const result = render(
    <AutomationListProvider
      automations={[{ ...savedAutomation, nextRunAt: null }]}
      userPreferences={preferences}
    >
      <AutomationListOptionsDropdown />
      <AutomationList />
    </AutomationListProvider>,
  );
  expect(screen.getAllByRole("columnheader")).toHaveLength(4);
  expect(
    screen.getByRole("columnheader", { name: "labelInformation" }),
  ).toBeTruthy();
  expect(screen.getByText("W")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
  expect(await screen.findByRole("menu")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "labelSaveView" })).toBeNull();
  result.rerender(
    <AutomationListProvider automations={[]} userPreferences={preferences}>
      <AutomationList />
    </AutomationListProvider>,
  );
  expect(screen.getByText("labelEmpty")).toBeTruthy();
});

it("saves description and appearance independently from the chat, then saves a paused copy", async () => {
  const form = editor(automation, "settings");
  fireEvent.change(screen.getByLabelText("labelDescription"), {
    target: { value: "Card summary" },
  });
  fireEvent.click(screen.getByTitle("timer"));
  const colorName = defaultColors[0]!.name;
  fireEvent.click(screen.getByRole("button", { name: colorName }));
  form.submit();
  expect(client.execute).toHaveBeenLastCalledWith(
    expect.objectContaining({
      id: automation.id,
      description: "Card summary",
      message: automation.message,
      icon: { type: "icon-lucide", iconName: "timer" },
      color: defaultColors[0]!.color,
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
  fireEvent.click(
    await screen.findByRole("menuitem", { name: "labelSaveCopy" }),
  );
  expect(client.execute).toHaveBeenLastCalledWith(
    expect.objectContaining({
      id: undefined,
      enabled: false,
      description: "Card summary",
      message: automation.message,
    }),
  );
  expect(automation.enabled).toBe(true);
});

it("stores automation favorites alongside other resource types without mutating the supplied configuration", () => {
  const favorites = {
    version: "favorites-v2" as const,
    showInSidebar: true,
    favorites: [{ type: "agent" as const, id: automation.id! }],
  };
  const result = render(
    <AutomationFavorite automation={savedAutomation} favorites={favorites} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "tooltipAddFavorite" }));
  expect(client.execute).toHaveBeenCalledWith({
    ...favorites,
    favorites: [
      ...favorites.favorites,
      { type: "automation", id: automation.id },
    ],
  });
  expect(favorites.favorites).toHaveLength(1);
  result.rerender(
    <AutomationFavorite
      automation={savedAutomation}
      favorites={{
        ...favorites,
        favorites: [
          ...favorites.favorites,
          { type: "automation", id: automation.id! },
        ],
      }}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "tooltipRemoveFavorite" }),
  );
  expect(client.execute).toHaveBeenLastCalledWith(favorites);
});

it("defaults to daily calendar execution with all weekdays selected and reveals day switches only on demand", () => {
  const form = editor(undefined, "trigger");
  expect(
    screen
      .getByRole("button", { name: "options.weekly" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
  expect(screen.getByLabelText("labelTime")).toBeTruthy();
  expect(screen.queryByRole("switch")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "labelEveryWeekday" }));
  for (const control of screen.getAllByRole("switch"))
    expect(control.getAttribute("aria-checked")).toBe("true");
  fireEvent.click(screen.getByRole("switch", { name: "Sonntag" }));
  expect(
    screen.getByRole("button", { name: "labelSelectedWeekdays" }),
  ).toBeTruthy();
  form.view("default");
  expect(screen.getByText("labelDefineTrigger")).toBeTruthy();
  form.view("trigger");
  expect(
    screen.getByRole("button", { name: "labelSelectedWeekdays" }),
  ).toBeTruthy();
});

it("confirms deletion from the editor menu and returns to the automation list", async () => {
  client.pathname = `/app/automation/${automation.id}/edit`;
  editor(automation, "settings");
  fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "labelDelete" }));
  const dialog = within(await screen.findByRole("alertdialog"));
  fireEvent.click(dialog.getByRole("button", { name: "labelDelete" }));
  expect(client.execute).toHaveBeenCalledWith({ id: automation.id });
  act(() => client.actionOptionsByAction.get(deleteAutomation).onSuccess());
  expect(client.push).toHaveBeenLastCalledWith("/app/automation");
});

it("collapses info details and marks changed draft fields", () => {
  render(
    <AutomationInfo
      automation={{
        ...automation,
        message: "Draft message",
        agentId: agents[0]!.id,
        trigger: { type: "time", schedule: { kind: "hours", every: 4 } },
      }}
      editDefaultAutomation={{ ...automation, agentId: "previous" }}
      agents={agents}
      editable
      preview
    />,
  );
  expect(screen.queryByText("Draft message")).toBeNull();
  expect(screen.getAllByText("labelChanged")).toHaveLength(4);
  fireEvent.click(screen.getByRole("button", { name: "labelMessage" }));
  expect(screen.getByText("Draft message")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "labelAgent" }));
  expect(
    screen.getByRole("button", { name: "labelGoToAgent" }).getAttribute("href"),
  ).toBe(`/agent/${agents[0]!.id}`);
  fireEvent.click(screen.getByRole("button", { name: "labelTrigger" }));
  expect(screen.getByText("descriptionSchedule")).toBeTruthy();
});

it("copies the selected agent's suggestion into an editable message without starting a chat", () => {
  const suggestion = {
    id: "summary",
    label: "Weekly summary",
    message: "Summarize this week.",
  };
  const availableAgents = [
    { ...agents[0]!, recommendedMessages: [suggestion] },
    {
      ...agents[0]!,
      id: "another-agent",
      name: "Other agent",
      recommendedMessages: [
        { id: "other", label: "Other suggestion", message: "Other text" },
      ],
    },
  ];
  client.params = new URLSearchParams({ view: "chat" });
  render(<AutomationEditor initial={automation} agents={availableAgents} />, {
    wrapper: SidebarProvider,
  });
  expect(screen.queryByRole("button", { name: /Other suggestion/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Weekly summary/ }));
  const input = screen.getByLabelText("labelMessage") as HTMLTextAreaElement;
  expect(input.value).toBe(suggestion.message);
  expect(document.activeElement).toBe(input);
  expect(client.push).not.toHaveBeenCalled();
  expect(client.execute).not.toHaveBeenCalled();
  fireEvent.change(input, {
    target: { value: "Summarize this week and list next steps." },
  });
  fireEvent.submit(input.closest("form")!);
  expect(client.execute).toHaveBeenLastCalledWith(
    expect.objectContaining({
      message: "Summarize this week and list next steps.",
    }),
  );
  expect(suggestion.message).toBe("Summarize this week.");
});

it("formats run timestamps, sorts and groups history, and only links started chats", async () => {
  const { AutomationRuns } =
    await import("../../apps/web/app/(main)/app/automation/_components/AutomationRuns");
  const runs = [
    {
      id: "a",
      activity_id: "chat-a",
      state: "queued" as const,
      event: {},
      error_code: null,
      created_at: "2026-11-13T08:00:00Z",
      finished_at: "2026-11-13T08:00:02Z",
    },
    {
      id: "b",
      activity_id: "chat-b",
      state: "pending" as const,
      event: {},
      error_code: null,
      created_at: "2026-11-14T08:00:00Z",
      finished_at: null,
    },
  ];
  const ui = (preferences = {}) => (
    <SidebarProvider>
      <AutomationRuns
        automation={savedAutomation}
        runs={runs}
        userPreferences={preferences}
      />
    </SidebarProvider>
  );
  const result = render(ui());
  expect(
    result.container.querySelector("tbody time")?.getAttribute("datetime"),
  ).toBe(runs[1].created_at);
  const expected = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(runs[1].created_at));
  expect(screen.getAllByText(expected).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("button", { name: "labelOpenChat" })).toHaveLength(
    1,
  );
  result.rerender(ui({ sort: "created:asc", group: "state" }));
  expect(screen.getAllByText("states.pending")).toHaveLength(2);
  result.rerender(ui({ sort: "created:asc" }));
  expect(
    result.container.querySelector("tbody time")?.getAttribute("datetime"),
  ).toBe(runs[0].created_at);
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "zzzzzzzzzz" },
  });
  expect(await screen.findByText("labelNoMatchingRuns")).toBeTruthy();
  result.rerender(
    <SidebarProvider>
      <AutomationRuns automation={savedAutomation} runs={[]} />
    </SidebarProvider>,
  );
  expect(screen.getByText("labelNoRuns")).toBeTruthy();
});

it("shows stored day intervals as equivalent hours and saves hour edits", () => {
  const form = editor(
    {
      ...automation,
      trigger: { type: "time", schedule: { kind: "days", every: 3 } },
    },
    "trigger",
  );
  expect(
    (screen.getByLabelText("labelIntervalHours") as HTMLInputElement).value,
  ).toBe("72");
  fireEvent.change(screen.getByLabelText("labelIntervalHours"), {
    target: { value: "48" },
  });
  form.submit();
  expect(client.execute).toHaveBeenLastCalledWith(
    expect.objectContaining({
      trigger: { type: "time", schedule: { kind: "hours", every: 48 } },
    }),
  );
});

it("starts the saved automation through the editor options menu", async () => {
  editor(automation, "trigger");
  expect(screen.queryByRole("button", { name: "labelRunNow" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "labelRunNow" }));
  expect(client.execute).toHaveBeenCalledWith({
    id: automation.id,
    requestId: expect.any(String),
  });
});

it("previews localized schedule dates, preserves saved deadlines and handles incomplete schedules", async () => {
  const { AutomationScheduleFields } =
    await import("../../apps/web/app/(main)/app/automation/_components/AutomationScheduleFields");
  vi.useFakeTimers();
  try {
    vi.setSystemTime(new Date("2026-11-14T12:45:00Z"));
    const onChange = vi.fn();
    const result = render(
      <AutomationScheduleFields
        schedule={{ kind: "hours", every: 3 }}
        onChange={onChange}
      />,
    );
    const time = () => result.container.querySelector("time");
    expect(time()?.dateTime).toBe("2026-11-14T13:00:00.000Z");
    expect(time()?.textContent).toBe(
      new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date("2026-11-14T13:00:00Z")),
    );
    act(() => vi.advanceTimersByTime(16 * 60000));
    expect(time()?.dateTime).toBe("2026-11-14T14:00:00.000Z");
    result.rerender(
      <AutomationScheduleFields
        schedule={{ kind: "hours", every: 3 }}
        nextRunAt="2026-11-14T16:00:00Z"
        onChange={onChange}
      />,
    );
    expect(time()?.dateTime).toBe("2026-11-14T16:00:00.000Z");
    expect(screen.queryByText(/labelAfterSave/)).toBeNull();
    result.rerender(
      <AutomationScheduleFields
        schedule={{
          kind: "weekly",
          weekdays: [],
          time: "09:00",
          timezone: "Europe/Vienna",
        }}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("labelCompleteSchedule")).toBeTruthy();
    result.rerender(
      <AutomationScheduleFields
        schedule={{ kind: "once", at: "2026-11-13T10:00:00Z" }}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("labelNoNextRun")).toBeTruthy();
    result.rerender(
      <AutomationScheduleFields
        schedule={{ kind: "hours", every: 3 }}
        enabled={false}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("labelPaused")).toBeTruthy();
    expect(time()).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});

it("switches from the saved deadline to a draft preview when editing the schedule", () => {
  client.params = new URLSearchParams("view=trigger");
  const result = render(
    <AutomationEditor
      initial={{ ...automation, nextRunAt: "2099-01-01T16:00:00Z" }}
      agents={agents}
      repositories={repositories}
    />,
    { wrapper: SidebarProvider },
  );
  expect(result.container.querySelector("time")?.getAttribute("datetime")).toBe(
    "2099-01-01T16:00:00.000Z",
  );
  fireEvent.change(screen.getByLabelText("labelTime"), {
    target: { value: "11:30" },
  });
  expect(
    result.container.querySelector("time")?.getAttribute("datetime"),
  ).not.toBe("2099-01-01T16:00:00.000Z");
  expect(screen.getByText(/labelAfterSave/)).toBeTruthy();
});

it("shows the persisted localized deadline in overview and list", () => {
  const expected = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(savedAutomation.nextRunAt));
  const result = render(<AutomationInfo automation={savedAutomation} />);
  expect(screen.getAllByText(expected).length).toBeGreaterThan(0);
  expect(result.container.querySelector("time")?.getAttribute("datetime")).toBe(
    new Date(savedAutomation.nextRunAt).toISOString(),
  );
  result.rerender(
    <AutomationListProvider
      automations={[savedAutomation]}
      userPreferences={{ view: "table" }}
    >
      <AutomationList />
    </AutomationListProvider>,
  );
  expect(
    screen.getByRole("columnheader", { name: "labelNextRun" }),
  ).toBeTruthy();
  expect(
    within(screen.getByRole("table")).getAllByText(expected).length,
  ).toBeGreaterThan(0);
});

it("marks empty names with a linked field error and clears validation when corrected", () => {
  const form = editor(automation, "settings");
  const name = screen.getByLabelText("labelName");
  fireEvent.change(name, { target: { value: "   " } });
  form.submit();
  expect(name.getAttribute("aria-invalid")).toBe("true");
  expect(
    document.getElementById(name.getAttribute("aria-describedby")!)
      ?.textContent,
  ).toBe("errorName");
  expect(client.execute).not.toHaveBeenCalled();
  fireEvent.change(name, { target: { value: "Corrected" } });
  expect(name.getAttribute("aria-invalid")).toBe("false");
  expect(screen.queryByText("errorName")).toBeNull();
  expect(screen.queryByText("errorInvalid")).toBeNull();
  form.submit();
  expect(client.execute).toHaveBeenCalledWith(
    expect.objectContaining({ name: "Corrected" }),
  );
});

it("shows separate agent and message errors and marks all affected tabs", () => {
  const form = editor(undefined, "chat");
  form.submit();
  expect(screen.getByText("errorAgent")).toBeTruthy();
  expect(screen.getByText("errorMessage")).toBeTruthy();
  expect(
    screen.getByLabelText("labelMessage").getAttribute("aria-invalid"),
  ).toBe("true");
  expect(
    screen
      .getByRole("button", { name: /labelChooseResource/ })
      .getAttribute("aria-invalid"),
  ).toBe("true");
});

it.each([
  [{ kind: "hours", every: 0 }, "labelIntervalHours", "errorInterval"],
  [
    { kind: "monthly", day: 32, time: "09:00", timezone: "Europe/Vienna" },
    "labelMonthday",
    "errorMonthday",
  ],
  [
    { kind: "weekly", weekdays: [1], time: "", timezone: "Europe/Vienna" },
    "labelTime",
    "errorTime",
  ],
  [{ kind: "once", at: "" }, "labelOnce", "errorOnce"],
] as const)("marks invalid schedule inputs: %s", (schedule, label, error) => {
  const form = editor(
    {
      ...automation,
      trigger: {
        type: "time",
        schedule: structuredClone(schedule) as AutomationSchedule,
      },
    },
    "trigger",
  );
  form.submit();
  const input = screen.getByLabelText(label);
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(
    document.getElementById(input.getAttribute("aria-describedby")!)
      ?.textContent,
  ).toBe(error);
  expect(client.execute).not.toHaveBeenCalled();
});

it("shows missing weekdays and invalid timezone even while options are collapsed", () => {
  const form = editor(
    {
      ...automation,
      trigger: {
        type: "time",
        schedule: {
          kind: "weekly",
          weekdays: [],
          time: "09:00",
          timezone: "Invalid/Zone",
        },
      },
    },
    "trigger",
  );
  form.submit();
  expect(screen.getByText("errorWeekdays")).toBeTruthy();
  expect(screen.getByText("errorTimezone")).toBeTruthy();
  expect(screen.queryByRole("switch", { name: "Monday" })).toBeNull();
});

it("shows missing file events beside their collapsed selection", () => {
  const form = editor(
    {
      ...automation,
      trigger: {
        type: "storage",
        storage: { type: "documentRepository", documentRepositoryId: "demo" },
        folder: "",
        includeSubfolders: true,
        attachment: "copy",
        events: [],
      },
    },
    "trigger",
  );
  form.submit();
  expect(screen.getByText("errorEvents")).toBeTruthy();
  expect(client.execute).not.toHaveBeenCalled();
});
