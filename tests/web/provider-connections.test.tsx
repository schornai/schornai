// @vitest-environment jsdom
import { client } from "./client-setup";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarProvider } from "@schornio/aibox-package-ui/components/sidebar";

import { ConnectionTypeSelection } from "../../apps/web/app/(settings)/settings/connections/_components/ConnectionTypeSelection";
vi.mock("@/lib/groupSortView/action", () => ({ savePreferences: vi.fn() }));
const request = vi.hoisted(() => vi.fn());
vi.doUnmock("next-safe-action/hooks");
const { ConnectionsManager } =
  await import("../../apps/web/app/(settings)/settings/connections/_components/ConnectionsManager");
const { ConnectionForm } =
  await import("../../apps/web/app/(settings)/settings/connections/_components/ConnectionForm");
vi.mock(
  "../../apps/web/app/(settings)/settings/connections/_actions/saveConnection",
  () => ({ saveConnection: request }),
);
vi.mock(
  "../../apps/web/app/(settings)/settings/connections/_actions/deleteConnection",
  () => ({ deleteConnection: request }),
);
const connections = [
  {
    id: "one",
    name: "Zulu",
    kind: "brave",
    client_id: null,
    market: null,
  },
  {
    id: "two",
    name: "Alpha",
    kind: "oauth",
    client_id: "client",
    market: null,
  },
];
beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.clearAllMocks();
  client.params = new URLSearchParams();
  client.pathname = "/settings/connections";
  request.mockResolvedValue({ data: { id: "saved" } });
});
afterEach(cleanup);
function list(data = connections) {
  return render(
    <SidebarProvider>
      <ConnectionsManager initialConnections={data} />
    </SidebarProvider>,
  );
}
it("puts creation in the empty state and header options, linking to type selection", async () => {
  list([]);
  expect(
    screen.getByRole("button", { name: "labelAdd" }).getAttribute("href"),
  ).toBe("/settings/connections/new");
  expect(screen.queryByRole("textbox")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "labelOptions" }));
  expect(
    (await screen.findByRole("menuitem", { name: "labelAdd" })).getAttribute(
      "href",
    ),
  ).toBe("/settings/connections/new");
});
it("sorts the table and groups OAuth apps separately from search providers", () => {
  client.params = new URLSearchParams("group=kind&sort=name:asc&view=cards");
  list();
  expect(screen.getByText("labelGroupOAuth")).toBeTruthy();
  expect(screen.getByText("labelGroupWebSearch")).toBeTruthy();
  expect(
    screen
      .getAllByRole("link")
      .filter((x) => ["Alpha", "Zulu"].includes(x.textContent!))
      .map((x) => x.textContent),
  ).toEqual(["Alpha", "Zulu"]);
});
it("filters without showing the onboarding empty state", async () => {
  list();
  fireEvent.change(screen.getByRole("textbox", { name: "labelSearch" }), {
    target: { value: "no-match-xyz" },
  });
  await waitFor(() => expect(screen.getByText("labelNoResults")).toBeTruthy());
  expect(screen.queryByRole("button", { name: "labelAdd" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "labelClearSearch" }));
  await waitFor(() =>
    expect(screen.getByRole("link", { name: "Alpha" })).toBeTruthy(),
  );
});
it("type selection links to all dedicated forms", () => {
  render(<ConnectionTypeSelection />);
  for (const kind of ["oauth", "brave", "staan"])
    expect(
      screen
        .getByRole("button", { name: `labelType_${kind}` })
        .getAttribute("href"),
    ).toBe(`/settings/connections/new/${kind}`);
});
it("saves the route-selected kind and returns to the refreshed list", async () => {
  render(<ConnectionForm kind="staan" />);
  expect(screen.queryByLabelText("labelClientId")).toBeNull();
  expect(screen.queryByRole("combobox")).toBeNull();
  fireEvent.change(screen.getByLabelText("labelName"), {
    target: { value: "Search" },
  });
  fireEvent.change(screen.getByLabelText("labelApiKey"), {
    target: { value: "test-secret" },
  });
  fireEvent.change(screen.getByLabelText("labelMarket"), {
    target: { value: "de-de" },
  });
  fireEvent.click(screen.getByRole("button", { name: "labelSave" }));
  await waitFor(() =>
    expect(client.push).toHaveBeenCalledWith("/settings/connections"),
  );
  expect(request.mock.calls[0]![0]).toMatchObject({
    kind: "staan",
    secret: "test-secret",
    market: "de-de",
  });
});
it("retains form values on failure and does not navigate", async () => {
  request.mockResolvedValue({ serverError: "INTERNAL_SERVER_ERROR" });
  render(<ConnectionForm kind="oauth" connection={connections[1]} />);
  expect(screen.queryByLabelText("labelClientSecret")).toBeNull();
  expect(
    (screen.getByLabelText("labelClientId") as HTMLInputElement).disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "labelSave" }));
  await waitFor(() => expect(screen.getByText("errorSave")).toBeTruthy());
  expect(client.push).not.toHaveBeenCalled();
});

it("requires OAuth credentials only on creation", () => {
  render(<ConnectionForm kind="oauth" />);
  expect(
    (screen.getByLabelText("labelClientId") as HTMLInputElement).disabled,
  ).toBe(false);
  expect(
    (screen.getByLabelText("labelClientSecret") as HTMLInputElement).required,
  ).toBe(true);
});

it("groups connections by their first letter", () => {
  client.params = new URLSearchParams("group=first-letter&sort=name:desc");
  list();
  expect(screen.getByText("A")).toBeTruthy();
  expect(screen.getByText("Z")).toBeTruthy();
});

it("requires confirmation, preserves a failed deletion and closes only after successful retry", async () => {
  request.mockResolvedValueOnce({ serverError: "denied" });
  list();
  fireEvent.click(screen.getAllByRole("button", { name: "labelDelete" })[0]!);
  const dialog = await screen.findByRole("alertdialog");
  expect(request).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "labelDelete" }));
  await screen.findByText("errorDelete");
  expect(request).toHaveBeenLastCalledWith({ id: "two" });
  fireEvent.click(within(dialog).getByRole("button", { name: "labelDelete" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(request).toHaveBeenCalledTimes(2);
  // Revalidation supplies the new collection; the manager does not mutate props.
  expect(screen.getByRole("link", { name: "Alpha" })).toBeTruthy();
});

it("cancels deletion and prevents duplicate requests while pending", async () => {
  list();
  fireEvent.click(screen.getAllByRole("button", { name: "labelDelete" })[0]!);
  fireEvent.click(
    within(await screen.findByRole("alertdialog")).getByRole("button", {
      name: "labelCancel",
    }),
  );
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(request).not.toHaveBeenCalled();
  const pending = Promise.withResolvers<{ data: { id: string } }>();
  request.mockReturnValueOnce(pending.promise);
  fireEvent.click(screen.getAllByRole("button", { name: "labelDelete" })[0]!);
  const dialog = await screen.findByRole("alertdialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "labelDelete" }));
  await waitFor(() =>
    expect(
      (
        within(dialog).getByRole("button", {
          name: "labelCancel",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true),
  );
  fireEvent.click(within(dialog).getByRole("button", { name: "labelDelete" }));
  expect(request).toHaveBeenCalledOnce();
  await act(async () => pending.resolve({ data: { id: "two" } }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
});
it("omits immutable OAuth credentials when renaming", async () => {
  render(<ConnectionForm kind="oauth" connection={connections[1]} />);
  fireEvent.change(screen.getByLabelText("labelName"), {
    target: { value: "Renamed" },
  });
  fireEvent.click(screen.getByRole("button", { name: "labelSave" }));
  await waitFor(() => expect(request).toHaveBeenCalled());
  const body = request.mock.calls[0]![0];
  expect(body.name).toBe("Renamed");
  expect(body).not.toHaveProperty("clientId");
  expect(body).not.toHaveProperty("secret");
});

it.each([false, true])(
  "copies only the callback URL without submitting, failure=%s",
  async (fails) => {
    const user = userEvent.setup();
    const write = vi.spyOn(navigator.clipboard, "writeText");
    if (fails) write.mockRejectedValueOnce(new Error("denied"));
    else write.mockResolvedValueOnce();
    render(<ConnectionForm kind="oauth" />);
    await user.click(screen.getByRole("button", { name: "labelCopyCallback" }));
    expect(write).toHaveBeenCalledWith(
      `${window.location.origin}/api/mcp/oauth/callback`,
    );
    expect(
      await screen.findByRole("button", {
        name: fails ? "errorCopyCallback" : "labelCallbackCopied",
      }),
    ).toBeTruthy();
    expect(request).not.toHaveBeenCalled();
    write.mockRestore();
  },
);
