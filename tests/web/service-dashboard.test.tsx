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
