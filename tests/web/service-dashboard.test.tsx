// @vitest-environment jsdom
import type { ReactNode } from "react";
import { SidebarProvider } from "@schornio/aibox-package-ui/components/sidebar";
import { client } from "./client-setup";
import {
  act,
  cleanup,
  fireEvent,
  render as renderReact,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ArtifactDashboard } from "../../apps/web/app/(settings)/artifacts/_components/ArtifactDashboard";
import { ServiceDashboard } from "../../apps/web/app/(settings)/service/_components/ServiceDashboard";
import { deleteArtifact } from "../../apps/web/app/(settings)/artifacts/_actions/deleteArtifact";
import {
  serviceArtifacts,
  serviceMachines,
  serviceNow,
} from "../../apps/web/stories/(settings)/service/fixtures";
vi.mock(
  "../../apps/web/app/(settings)/artifacts/_actions/deleteArtifact",
  () => ({ deleteArtifact: vi.fn() }),
);
vi.mock("@/lib/groupSortView/action", () => ({ savePreferences: vi.fn() }));
const render = (ui: ReactNode) => renderReact(ui, { wrapper: SidebarProvider });
beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
});

it("distinguishes an empty service list from a search with no matches and shows disconnected state", async () => {
  const { rerender } = render(
    <ServiceDashboard machines={[]} connected={false} now={serviceNow} />,
  );
  expect(screen.getByText("labelNoMachines")).toBeTruthy();
  expect(screen.getByText("descriptionDisconnected")).toBeTruthy();
  rerender(<ServiceDashboard machines={serviceMachines} now={serviceNow} />);
  fireEvent.change(screen.getByRole("textbox", { name: "labelSearch" }), {
    target: { value: "no-machine-matches" },
  });
  await waitFor(() => expect(screen.getByText("labelNoResults")).toBeTruthy());
  expect(screen.getByText("descriptionNoResults")).toBeTruthy();
});

const variedMachines = () => [
  {
    ...serviceMachines[0]!,
    name: "Alpha",
    platform: "linux/x64",
    roles: [],
    state: "stopped" as const,
    metrics: {
      ...serviceMachines[0]!.metrics,
      cpuPercent: null,
      memory: { used: 512, total: 1024 },
      disk: null,
      gpus: [{ name: "GPU", utilizationPercent: null }],
    },
    sync: { state: "error" as const },
    services: [],
  },
  {
    ...serviceMachines[1]!,
    name: "Beta",
    roles: ["supabase", "core"],
    receivedAt: "2026-10-24T13:59:50Z",
    metrics: {
      ...serviceMachines[1]!.metrics,
      memory: { used: 2 * 1024 ** 2, total: 4 * 1024 ** 2 },
    },
  },
];

it.each([
  { sort: "name:desc", expected: ["Beta", "Alpha"] },
  { sort: "receivedAt:desc", expected: ["Alpha", "Beta"] },
  { sort: "cpu:desc", expected: ["Beta", "Alpha"] },
  { sort: "memory:asc", expected: ["Alpha", "Beta"] },
])(
  "sorts service rows by $sort including missing readings",
  ({ sort, expected }) => {
    client.params = new URLSearchParams({ view: "table", sort });
    render(<ServiceDashboard machines={variedMachines()} now={serviceNow} />);
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(
      rows.map(
        (row) =>
          within(row).getAllByRole("cell")[0]!.textContent?.split("linux")[0],
      ),
    ).toEqual(expected);
    expect(screen.getByText("state.stopped")).toBeTruthy();
    expect(screen.getAllByText(/labelNoRoles/).length).toBeGreaterThan(0);
    expect(
      screen.getByText("supabase:db: state.running · health.healthy"),
    ).toBeTruthy();
  },
);

it.each([
  { group: "platform", label: "linux/x64" },
  { group: "role", label: "core" },
  { group: "first-letter", label: "A" },
  { group: "state", label: "state.stopped" },
])("groups service cards by $group", ({ group, label }) => {
  client.params = new URLSearchParams({ view: "cards", group });
  render(<ServiceDashboard machines={variedMachines()} now={serviceNow} />);
  expect(screen.getByRole("heading", { name: label })).toBeTruthy();
  expect(screen.getAllByText("Alpha").length).toBeGreaterThan(0);
});

it("updates offline state with the clock and clears its timer on unmount", () => {
  vi.useFakeTimers();
  vi.setSystemTime(serviceNow);
  const { unmount } = render(
    <ServiceDashboard machines={[serviceMachines[0]!]} />,
  );
  expect(screen.queryByText("state.offline")).toBeNull();
  act(() => vi.advanceTimersByTime(120_000));
  expect(screen.getByText("state.offline")).toBeTruthy();
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it("shows upload guidance for an empty artifact list and a distinct no-results state", async () => {
  const { rerender } = render(
    <ArtifactDashboard artifacts={[]} connected={false} />,
  );
  expect(screen.getByText("labelNoArtifacts")).toBeTruthy();
  expect(
    screen
      .getByRole("button", { name: "labelUploadXRAG" })
      .getAttribute("href"),
  ).toBe("/settings/xrag");
  expect(screen.getByText("descriptionDisconnected")).toBeTruthy();
  rerender(<ArtifactDashboard artifacts={serviceArtifacts} />);
  fireEvent.change(screen.getByRole("textbox", { name: "labelSearch" }), {
    target: { value: "no-package-matches" },
  });
  await waitFor(() => expect(screen.getByText("labelNoResults")).toBeTruthy());
  expect(screen.queryByRole("button", { name: "labelUploadXRAG" })).toBeNull();
});

const variedArtifacts = () => [
  {
    ...serviceArtifacts[0]!,
    name: "Alpha.tar",
    size: 512,
    deletedAt: "2026-10-24T13:30:00Z",
  },
  {
    ...serviceArtifacts[1]!,
    name: "Beta.tar",
    xrag: { xrag_version: 2, xrag_type: "future" },
  },
  { ...serviceArtifacts[2]!, name: "Gamma.tar" },
];

it.each([
  { group: "target", label: "labelAllServices" },
  { group: "state", label: "labelCleanupPending" },
  { group: "first-letter", label: "A" },
])(
  "groups artifact tiles by $group while preserving withdrawal warnings",
  ({ group, label }) => {
    client.params = new URLSearchParams({ view: "tiles", group });
    render(<ArtifactDashboard artifacts={variedArtifacts()} />);
    expect(screen.getByRole("heading", { name: label })).toBeTruthy();
    expect(screen.getByText("descriptionSetupWithdrawn")).toBeTruthy();
    expect(screen.getByText("Alpha.tar")).toBeTruthy();
    expect(screen.getAllByText(/labelOtherRecipients/).length).toBeGreaterThan(
      0,
    );
  },
);

it.each([
  { sort: "name:desc", expected: ["Gamma.tar", "Beta.tar", "Alpha.tar"] },
  { sort: "createdAt:desc", expected: ["Alpha.tar", "Beta.tar", "Gamma.tar"] },
  { sort: "size:asc", expected: ["Alpha.tar", "Gamma.tar", "Beta.tar"] },
])("sorts artifact table rows by $sort", ({ sort, expected }) => {
  client.params = new URLSearchParams({ view: "table", sort });
  render(<ArtifactDashboard artifacts={variedArtifacts()} />);
  const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
  expect(
    rows.map((row) => within(row).getAllByRole("cell")[0]!.textContent),
  ).toEqual(expected);
  expect(screen.getByText("0.5 KiB")).toBeTruthy();
});

it.each([{ platform: "linux" }, { arch: "arm64" }])(
  "shows setup target restrictions for partial platform metadata",
  (target) => {
    render(
      <ArtifactDashboard
        artifacts={[
          {
            ...serviceArtifacts[0]!,
            xrag: { ...serviceArtifacts[0]!.xrag, ...target },
          },
        ]}
      />,
    );
    expect(screen.getByText("labelServicesForPlatform")).toBeTruthy();
  },
);

it("allows cancelling deletion of a non-setup artifact without submitting", async () => {
  render(<ArtifactDashboard artifacts={[serviceArtifacts[1]!]} />);
  fireEvent.click(screen.getByRole("button", { name: "labelDeleteNamed" }));
  expect(await screen.findByRole("alertdialog")).toBeTruthy();
  expect(screen.queryByText("descriptionDeleteLatest")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "labelCancel" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(client.execute).not.toHaveBeenCalled();
});
afterEach(() => {
  cleanup();
  client.params = new URLSearchParams();
  client.pathname = "/test";
  client.pending = false;
  vi.clearAllMocks();
});
it("shows only machines with offline states and unavailable GPU values", () => {
  render(<ServiceDashboard machines={serviceMachines} now={serviceNow} />);
  expect(screen.getByText("state.offline")).toBeTruthy();
  expect(screen.getByText("labelUnavailable")).toBeTruthy();
  expect(screen.queryByText(serviceArtifacts[0]!.name)).toBeNull();
});
it("requires confirmation and keeps the dialog open until the delete action succeeds", async () => {
  render(<ArtifactDashboard artifacts={[serviceArtifacts[0]!]} />);
  fireEvent.click(screen.getByRole("button", { name: "labelDeleteNamed" }));
  expect(await screen.findByRole("alertdialog")).toBeTruthy();
  expect(screen.getByText("descriptionDeleteLatest")).toBeTruthy();
  expect(client.execute).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "labelDelete" }));
  expect(client.execute).toHaveBeenCalledWith({ id: serviceArtifacts[0]!.id });
  expect(screen.getByRole("alertdialog")).toBeTruthy();
  act(() => client.actionOptionsByAction.get(deleteArtifact).onSuccess());
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
});

it("restores saved service tables, groups offline states, and lets URL options override preferences", () => {
  client.params = new URLSearchParams("group=state&sort=name:desc");
  render(
    <ServiceDashboard
      machines={serviceMachines}
      now={serviceNow}
      userPreferences={{ view: "table", group: "no-group", sort: "name:asc" }}
    />,
  );
  expect(screen.getByRole("table")).toBeTruthy();
  expect(screen.getAllByText("state.offline").length).toBe(2);
  expect(
    screen.getByText("supabase:db: labelLastKnown · health.healthy"),
  ).toBeTruthy();
});
it("renders grouped attachments using the same filtered collection and keeps purged artifacts hidden", async () => {
  client.params = new URLSearchParams("view=tiles&group=type&sort=size:desc");
  const { container } = render(
    <ArtifactDashboard
      artifacts={[
        ...serviceArtifacts,
        {
          ...serviceArtifacts[0]!,
          id: "d".repeat(64),
          name: "purged.tar",
          deletedAt: "2026-10-24T13:00:00Z",
          purgedAt: "2026-10-24T13:00:01Z",
        },
      ]}
    />,
  );
  expect(container.querySelectorAll('[data-slot="attachment"]')).toHaveLength(
    3,
  );
  expect(screen.queryByText("purged.tar")).toBeNull();
  fireEvent.change(screen.getByRole("textbox", { name: "labelSearch" }), {
    target: { value: "whisper" },
  });
  await waitFor(() =>
    expect(container.querySelectorAll('[data-slot="attachment"]')).toHaveLength(
      1,
    ),
  );
  expect(screen.getByText(serviceArtifacts[1]!.name)).toBeTruthy();
});
