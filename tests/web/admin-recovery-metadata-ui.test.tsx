// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
const state = vi.hoisted(() => ({
  execute: vi.fn(),
  executeAsync: vi.fn(),
  result: {} as any,
  isPending: false,
  reset: vi.fn(),
}));
vi.mock("next-safe-action/hooks", () => ({ useAction: () => state }));
vi.mock("next-i18next/client", () => ({
  useT: () => ({ t: (key: string) => key }),
}));
vi.mock(
  "../../apps/web/app/(settings)/settings/user/_actions/reissueResetKey",
  () => ({ reissueResetKey: vi.fn() }),
);
vi.mock(
  "../../apps/web/app/(settings)/settings/sso/_actions/downloadSAMLMetadata",
  () => ({ downloadSAMLMetadata: vi.fn() }),
);
import { UserResetKey } from "../../apps/web/app/(settings)/settings/user/[userId]/_components/UserResetKey";
import { SAMLMetadataDownload } from "../../apps/web/app/(settings)/settings/sso/_components/SAMLMetadataDownload";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
beforeEach(() => {
  vi.clearAllMocks();
  state.result = {};
  state.isPending = false;
});

it("requires confirmation, supports cancel and prevents pending duplicate issuance", () => {
  const { rerender } = render(<UserResetKey userId="user-id" isLocal />);
  fireEvent.click(screen.getByRole("button", { name: "labelIssue" }));
  expect(state.execute).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "labelCancel" }));
  expect(screen.queryByText("descriptionConfirm")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "labelIssue" }));
  fireEvent.click(screen.getByRole("button", { name: "labelConfirm" }));
  expect(state.execute).toHaveBeenCalledWith({ userId: "user-id" });
  state.isPending = true;
  rerender(<UserResetKey userId="user-id" isLocal />);
  expect(
    (screen.getByRole("button", { name: "labelConfirm" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});
it("shows an actionable error without issuing again automatically", () => {
  state.result = { serverError: "error" };
  render(<UserResetKey userId="user-id" isLocal />);
  expect(screen.getByRole("alert").textContent).toBe("errorIssue");
  expect(state.execute).not.toHaveBeenCalled();
});
it("shows the key once, copies it, and clears the action state on close", async () => {
  state.result = {
    data: { passwordResetKey: "secret", expires: "2026-10-24T12:00:00Z" },
  };
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  const { rerender } = render(<UserResetKey userId="user-id" isLocal />);
  fireEvent.click(screen.getByRole("button", { name: "labelCopy" }));
  await waitFor(() => expect(screen.getByText("labelCopied")).toBeTruthy());
  expect(writeText).toHaveBeenCalledWith("secret");
  fireEvent.click(screen.getByRole("button", { name: "labelClose" }));
  expect(state.reset).toHaveBeenCalled();
  state.result = {};
  rerender(<UserResetKey userId="user-id" isLocal />);
  expect(screen.queryByDisplayValue("secret")).toBeNull();
});
it("provides manual copying after clipboard rejection", async () => {
  state.result = {
    data: { passwordResetKey: "secret", expires: "2026-10-24T12:00:00Z" },
  };
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockRejectedValue(new Error()) },
  });
  render(<UserResetKey userId="user-id" isLocal />);
  fireEvent.click(screen.getByRole("button", { name: "labelCopy" }));
  await waitFor(() => expect(screen.getByText("errorCopy")).toBeTruthy());
  expect(screen.getByDisplayValue("secret")).toBeTruthy();
});
it("explains SSO without offering a local key", () => {
  render(<UserResetKey userId="user-id" isLocal={false} />);
  expect(screen.getByText("descriptionSSO")).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
});
const xml =
  '<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="https://instance.test"><SPSSODescriptor><AssertionConsumerService Location="https://instance.test/acs" /></SPSSODescriptor></EntityDescriptor>';
it("downloads valid metadata as an XML file", async () => {
  state.executeAsync.mockResolvedValue({ data: { configured: true, xml } });
  const createObjectURL = vi.fn().mockReturnValue("blob:metadata");
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe("saml-sp-metadata.xml");
      expect(this.href).toBe("blob:metadata");
    });
  render(<SAMLMetadataDownload />);
  fireEvent.click(screen.getByRole("button", { name: "labelDownload" }));
  await waitFor(() =>
    expect(screen.getByText("descriptionSuccess")).toBeTruthy(),
  );
  expect(click).toHaveBeenCalledOnce();
  expect(createObjectURL.mock.calls[0][0].type).toBe(
    "application/samlmetadata+xml;charset=utf-8",
  );
});
it("shows disabled configuration and prevents pending downloads", async () => {
  state.executeAsync.mockResolvedValue({ data: { configured: false } });
  const { rerender } = render(<SAMLMetadataDownload />);
  fireEvent.click(screen.getByRole("button", { name: "labelDownload" }));
  await waitFor(() =>
    expect(screen.getByText("descriptionNotConfigured")).toBeTruthy(),
  );
  state.isPending = true;
  rerender(<SAMLMetadataDownload />);
  expect(
    (screen.getByRole("button", { name: "labelDownload" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});
it.each([
  "<malformed",
  "<html>error</html>",
  '<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" />',
  "<!DOCTYPE x>" + xml,
])("rejects invalid XML: %s", async (invalid) => {
  state.executeAsync.mockResolvedValue({
    data: { configured: true, xml: invalid },
  });
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click");
  render(<SAMLMetadataDownload />);
  fireEvent.click(screen.getByRole("button", { name: "labelDownload" }));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toBe("errorDownload"),
  );
  expect(click).not.toHaveBeenCalled();
});
it("shows a server error and allows retrying", async () => {
  state.executeAsync.mockResolvedValue({ serverError: "failed" });
  render(<SAMLMetadataDownload />);
  fireEvent.click(screen.getByRole("button", { name: "labelDownload" }));
  await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  fireEvent.click(screen.getByRole("button", { name: "labelDownload" }));
  expect(state.executeAsync).toHaveBeenCalledTimes(2);
});
