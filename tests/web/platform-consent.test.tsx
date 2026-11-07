// @vitest-environment jsdom
import "./client-setup";
import { client } from "./client-setup";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PlatformMcpConsent } from "../../apps/web/app/oauth/authorize/_components/PlatformMcpConsent";

vi.mock(
  "../../apps/web/app/oauth/authorize/_actions/authorizePlatformMcp",
  () => ({ authorizePlatformMcp: vi.fn() }),
);
const request = {
  client_id: "client",
  redirect_uri: "https://client.test/callback",
  resource: "https://box.test/mcp",
  response_type: "code",
  code_challenge: "challenge",
  code_challenge_method: "S256",
  state: "state",
} as const;
afterEach(cleanup);
beforeEach(() => {
  client.pending = false;
  client.execute.mockClear();
});

it("displays the exact resource and redirect and approves only the selected ceiling", async () => {
  const user = userEvent.setup();
  render(
    <PlatformMcpConsent
      request={request}
      clientName="Desktop"
      levels={["user", "editor"]}
    />,
  );
  expect(screen.getByText(request.resource)).toBeTruthy();
  expect(screen.getByText(request.redirect_uri)).toBeTruthy();
  await user.click(screen.getByRole("combobox"));
  expect(screen.queryByRole("option", { name: "level.admin" })).toBeNull();
  await user.click(screen.getByRole("option", { name: "level.editor" }));
  fireEvent.click(screen.getByRole("button", { name: "labelApprove" }));
  expect(client.execute).toHaveBeenCalledExactlyOnceWith({
    request,
    approve: true,
    level: "editor",
  });
});

it("allows denial without any available access level but disables approval and selection", () => {
  render(
    <PlatformMcpConsent request={request} clientName="Desktop" levels={[]} />,
  );
  expect((screen.getByRole("combobox") as HTMLButtonElement).disabled).toBe(
    true,
  );
  expect(
    (screen.getByRole("button", { name: "labelApprove" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(screen.getByText("descriptionNoAccess")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "labelDeny" }));
  expect(client.execute).toHaveBeenCalledExactlyOnceWith({
    request,
    approve: false,
    level: "user",
  });
});

it("disables duplicate submissions during authorization", () => {
  client.pending = true;
  render(
    <PlatformMcpConsent
      request={request}
      clientName="Desktop"
      levels={["user"]}
    />,
  );
  for (const button of screen.getAllByRole("button"))
    expect((button as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("combobox") as HTMLButtonElement).disabled).toBe(
    true,
  );
  expect(client.execute).not.toHaveBeenCalled();
});

it("navigates only when the authorization action returns a redirect", () => {
  const assign = vi.fn();
  render(
    <PlatformMcpConsent
      request={request}
      clientName="Desktop"
      levels={["user"]}
    />,
  );
  vi.stubGlobal("window", { location: { assign } });
  client.actionOptions.onSuccess({ data: undefined });
  expect(assign).not.toHaveBeenCalled();
  client.actionOptions.onSuccess({
    data: { redirectUrl: "https://client.test/callback?code=opaque" },
  });
  expect(assign).toHaveBeenCalledExactlyOnceWith(
    "https://client.test/callback?code=opaque",
  );
  vi.unstubAllGlobals();
});
