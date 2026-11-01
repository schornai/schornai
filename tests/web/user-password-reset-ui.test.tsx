// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  execute: vi.fn(),
  result: {} as any,
  isPending: false,
}));
vi.mock("next-safe-action/hooks", () => ({ useAction: () => state }));
vi.mock("next-i18next/client", () => ({
  useT: () => ({ t: (key: string) => key }),
}));
vi.mock(
  "../../apps/web/app/(settings)/settings/user/_actions/createUser",
  () => ({ createUser: vi.fn() }),
);
vi.mock("../../apps/web/app/signin/_actions/resetPassword", () => ({
  resetPassword: vi.fn(),
}));
import { CreateUser } from "../../apps/web/app/(settings)/settings/user/_components/CreateUser";
import { ResetPassword } from "../../apps/web/app/signin/_components/ResetPassword";
afterEach(cleanup);
beforeEach(() => {
  state.execute.mockReset();
  state.result = {};
  state.isPending = false;
});

it("submits an email and disables creation while pending", () => {
  const { rerender } = render(<CreateUser />);
  fireEvent.change(screen.getByLabelText("labelEmail"), {
    target: { value: "new@example.test" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "labelCreate" }).closest("form")!,
  );
  expect(state.execute).toHaveBeenCalledWith({
    email: "new@example.test",
    firstName: "",
    lastName: "",
  });
  state.isPending = true;
  rerender(<CreateUser />);
  expect(
    (screen.getByRole("button", { name: "labelCreate" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});
it("shows and copies the key, links to the user and prevents duplicate creation", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  state.result = {
    data: {
      userId: "user-id",
      passwordResetKey: "key-value",
      expires: "2026-10-17T12:00:00Z",
    },
  };
  render(<CreateUser />);
  expect(screen.getByDisplayValue("key-value")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "labelCopy" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "labelCopied" })).toBeTruthy(),
  );
  expect(writeText).toHaveBeenCalledWith("key-value");
  expect(
    screen.getByRole("link", { name: "labelOpenUser" }).getAttribute("href"),
  ).toBe("/settings/user/user-id");
  expect(screen.queryByRole("button", { name: "labelCreate" })).toBeNull();
});
it("offers manual copying after clipboard failure", async () => {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockRejectedValue(new Error()) },
    configurable: true,
  });
  state.result = {
    data: {
      userId: "id",
      passwordResetKey: "key",
      expires: "2026-10-17T12:00:00Z",
    },
  };
  render(<CreateUser />);
  fireEvent.click(screen.getByRole("button", { name: "labelCopy" }));
  await waitFor(() =>
    expect(screen.getByText("errorCopy").textContent).toBe("errorCopy"),
  );
});
it("submits reset credentials and shows server and field errors", () => {
  const { rerender } = render(<ResetPassword />);
  for (const [label, value] of [
    ["labelEmail", "user@example.test"],
    ["labelKey", "key"],
    ["labelPassword", "new-password"],
    ["labelPasswordAgain", "new-password"],
  ]) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
  fireEvent.submit(
    screen.getByRole("button", { name: "labelReset" }).closest("form")!,
  );
  expect(state.execute).toHaveBeenCalledWith({
    email: "user@example.test",
    passwordResetKey: "key",
    password: "new-password",
    passwordAgain: "new-password",
  });
  state.result = {
    serverError: "failure",
    validationErrors: { passwordAgain: {} },
  };
  rerender(<ResetPassword />);
  expect(screen.getByText("errorReset")).toBeTruthy();
  expect(
    screen.getByLabelText("labelPasswordAgain").getAttribute("aria-invalid"),
  ).toBe("true");
});
it("hides reset credentials after success and links to password sign-in", () => {
  state.result = { data: { success: true } };
  render(<ResetPassword />);
  expect(screen.getByText("descriptionSuccess")).toBeTruthy();
  expect(screen.queryByLabelText("labelKey")).toBeNull();
  expect(
    screen.getByRole("link", { name: "labelSignIn" }).getAttribute("href"),
  ).toBe("/signin?method=password");
});

it("creates an editable access message and copies the edited body", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  state.result = {
    data: {
      userId: "id",
      passwordResetKey: "message-secret",
      expires: "2026-10-27T12:00:00Z",
    },
  };
  render(<CreateUser />);
  fireEvent.click(screen.getByRole("button", { name: "labelCreateMessage" }));
  const body = await screen.findByLabelText("labelBody");
  expect((body as HTMLTextAreaElement).value).toContain("message-secret");
  expect((body as HTMLTextAreaElement).value).toContain("/signin/reset");
  fireEvent.change(body, { target: { value: "Edited message & key" } });
  const dialog = screen.getByRole("dialog");
  const { within } = await import("@testing-library/react");
  fireEvent.click(within(dialog).getByRole("button", { name: "labelCopy" }));
  await waitFor(() =>
    expect(writeText).toHaveBeenCalledWith("Edited message & key"),
  );
  expect(
    within(dialog)
      .getByRole("link", { name: "labelEmail" })
      .getAttribute("href"),
  ).toContain("body=Edited%20message%20%26%20key");
  fireEvent.click(within(dialog).getByRole("button", { name: "labelClose" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});
