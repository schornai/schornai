// @vitest-environment jsdom
import "./client-setup";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { UserMcpGrant } from "../../packages/database/src/platformMcp/listUserGrants";
const actions = vi.hoisted(() => ({ revoke: vi.fn(), disconnect: vi.fn() }));
vi.mock(
  "../../apps/web/app/(settings)/me/connections/_actions/revokePlatformMcp",
  () => ({ revokePlatformMcp: actions.revoke }),
);
vi.mock(
  "../../apps/web/app/(settings)/me/connections/_actions/disconnectMCP",
  () => ({ disconnectMCP: actions.disconnect }),
);
vi.doUnmock("next-safe-action/hooks");
const { PersonalMCPConnections } =
  await import("../../apps/web/app/(settings)/me/connections/_components/PersonalMCPConnections");
const now = "2026-11-07T12:00:00Z";
const grant: UserMcpGrant = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Assistant",
  level: "editor",
  resource: "https://box.example/mcp",
  createdAt: "2026-11-01T09:00:00Z",
  expiresAt: "2026-12-01T09:00:00Z",
};
const serverUrl = "https://external.example/mcp";
beforeEach(() => {
  vi.clearAllMocks();
  actions.revoke.mockResolvedValue({ data: undefined });
  actions.disconnect.mockResolvedValue({ data: undefined });
});
afterEach(cleanup);
it.each([false, true])(
  "hides missing connection sections, incoming=%s",
  (incoming) => {
    render(
      <PersonalMCPConnections
        grants={incoming ? [grant] : []}
        serverUrls={incoming ? [] : [serverUrl]}
        now={now}
      />,
    );
    expect(screen.getAllByRole("table")).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: "labelTitle" }) !== null).toBe(
      incoming,
    );
    expect(
      screen.queryByRole("heading", { name: "labelOutgoing" }) !== null,
    ).toBe(!incoming);
    expect(screen.queryByText("labelEmpty")).toBeNull();
  },
);
it("renders one empty state without section headings or hints", () => {
  render(<PersonalMCPConnections grants={[]} serverUrls={[]} now={now} />);
  expect(screen.getAllByText("labelEmpty")).toHaveLength(1);
  expect(screen.queryByRole("table")).toBeNull();
  expect(screen.queryByText("description")).toBeNull();
  expect(screen.queryByText("descriptionOutgoing")).toBeNull();
});
it("shows both directions and marks expired or undated grants without marking active grants", () => {
  render(
    <PersonalMCPConnections
      grants={[
        grant,
        { ...grant, id: "expired", expiresAt: now },
        { ...grant, id: "undated", expiresAt: null },
      ]}
      serverUrls={[serverUrl]}
      now={now}
    />,
  );
  expect(screen.getAllByRole("table")).toHaveLength(2);
  expect(screen.getAllByText("labelExpired")).toHaveLength(2);
  expect(screen.getByText(serverUrl)).toBeTruthy();
});
for (const incoming of [true, false]) {
  const title = incoming ? "incoming" : "outgoing";
  const trigger = incoming ? "labelRevokeNamed" : "labelDisconnectNamed";
  const confirm = incoming ? "labelRevoke" : "labelDisconnect";
  const error = incoming ? "errorRevoke" : "errorDisconnect";
  const request = incoming ? actions.revoke : actions.disconnect;
  const payload = incoming ? { grantId: grant.id } : { serverUrl };
  const show = () =>
    render(
      <PersonalMCPConnections
        grants={incoming ? [grant] : []}
        serverUrls={incoming ? [] : [serverUrl]}
        now={now}
      />,
    );
  it(`${title}: requires confirmation and keeps failures open until a successful retry`, async () => {
    request.mockResolvedValueOnce({ serverError: "denied" });
    show();
    fireEvent.click(screen.getByRole("button", { name: trigger }));
    const dialog = await screen.findByRole("alertdialog");
    expect(request).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: confirm }));
    await screen.findByText(error);
    expect(request).toHaveBeenLastCalledWith(payload);
    fireEvent.click(within(dialog).getByRole("button", { name: confirm }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(request).toHaveBeenCalledTimes(2);
  });
  it(`${title}: cancels safely, clears prior errors and prevents duplicate pending requests`, async () => {
    request.mockResolvedValueOnce({ serverError: "denied" });
    show();
    fireEvent.click(screen.getByRole("button", { name: trigger }));
    let dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: confirm }));
    await screen.findByText(error);
    fireEvent.click(
      within(dialog).getByRole("button", { name: "labelCancel" }),
    );
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    const pending = Promise.withResolvers<{ data: undefined }>();
    request.mockReturnValueOnce(pending.promise);
    fireEvent.click(screen.getByRole("button", { name: trigger }));
    dialog = await screen.findByRole("alertdialog");
    expect(screen.queryByText(error)).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: confirm }));
    await waitFor(() =>
      expect(
        (
          within(dialog).getByRole("button", {
            name: "labelCancel",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true),
    );
    fireEvent.click(within(dialog).getByRole("button", { name: confirm }));
    expect(request).toHaveBeenCalledTimes(2);
    await act(async () => pending.resolve({ data: undefined }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });
}
