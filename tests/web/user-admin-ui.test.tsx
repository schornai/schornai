// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  "../../apps/web/app/(settings)/settings/user/_actions/toggleAdmin",
  () => ({ toggleAdmin: vi.fn() }),
);
import { UserEditorAdmin } from "../../apps/web/app/(settings)/settings/user/[userId]/_components/UserEditorAdmin";

afterEach(cleanup);
beforeEach(() => {
  state.execute.mockReset();
  state.result = {};
  state.isPending = false;
});

it("promotes an email user and offers revocation after the refreshed role arrives", () => {
  const { rerender } = render(
    <UserEditorAdmin userId="user-id" isAdmin={false} />,
  );
  expect(screen.getByText("descriptionUser")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "labelPromote" }));
  expect(state.execute).toHaveBeenCalledWith({
    userId: "user-id",
    toggle: "promoteToAdmin",
  });
  rerender(<UserEditorAdmin userId="user-id" isAdmin />);
  expect(screen.getByText("descriptionAdmin")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "labelDemote" }));
  expect(state.execute).toHaveBeenLastCalledWith({
    userId: "user-id",
    toggle: "demoteFromAdmin",
  });
});

it("disables repeat submissions while pending", () => {
  state.isPending = true;
  render(<UserEditorAdmin userId="user-id" isAdmin={false} />);
  const button = screen.getByRole("button", {
    name: "labelPromote",
  }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  fireEvent.click(button);
  expect(state.execute).not.toHaveBeenCalled();
});

it("shows an accessible failure and keeps the current role", () => {
  state.result = { serverError: "write failed" };
  render(<UserEditorAdmin userId="user-id" isAdmin={false} />);
  expect(screen.getByRole("alert").textContent).toBe("errorSave");
  expect(screen.getByRole("button", { name: "labelPromote" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "labelDemote" })).toBeNull();
});
