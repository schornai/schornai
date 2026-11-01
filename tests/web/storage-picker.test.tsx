// @vitest-environment jsdom
import "./client-setup";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const browse = vi.hoisted(() => vi.fn());
vi.mock("../../apps/web/app/_actions/storageBrowse", () => ({
  storageBrowse: browse,
}));
import { StoragePickerDialog } from "../../apps/web/app/_components/StoragePickerDialog";
const storage = {
  type: "documentRepository",
  workspaceId: "workspace",
  documentRepositoryId: "repo",
} as const;
const file = {
  file: true,
  path: "file.txt",
  name: "file.txt",
  size: 4,
  type: "text/plain",
  createdAtISO: "2026-10-17",
  updatedAtISO: "2026-10-17",
};
const folder = { folder: true, path: "folder", name: "folder" };
afterEach(cleanup);
beforeEach(() => {
  browse.mockReset().mockImplementation(async (input) => ({
    data: {
      repositories: [],
      files: input.storage ? (input.path ? [] : [folder, file]) : [],
    },
  }));
});
it("shows only folders for a writable destination, supports nested navigation and confirms the exact folder", async () => {
  const select = vi.fn(async () => {}),
    close = vi.fn();
  render(
    <StoragePickerDialog
      open
      onOpenChange={close}
      currentStorage={storage}
      mode="folder"
      onSelect={select}
    />,
  );
  fireEvent.click(await screen.findByRole("button", { name: "folder" }));
  await screen.findByText("/folder");
  await waitFor(() =>
    expect(
      (
        screen.getByRole("button", {
          name: "labelUseFolder",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  );
  expect(screen.queryByRole("button", { name: "file.txt" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "labelUseFolder" }));
  await waitFor(() =>
    expect(select).toHaveBeenCalledWith({
      storage,
      path: "folder",
      file: undefined,
    }),
  );
  expect(close).toHaveBeenCalledWith(false);
  expect(browse).toHaveBeenCalledWith({
    storage,
    path: "folder",
    mode: "write",
  });
});
it("selects an existing file with read access and retains selection after transfer failure", async () => {
  const select = vi.fn().mockRejectedValue(new Error("FILE_ALREADY_EXISTS"));
  const close = vi.fn();
  render(
    <StoragePickerDialog
      open
      onOpenChange={close}
      currentStorage={storage}
      mode="file"
      onSelect={select}
    />,
  );
  expect(
    (screen.getByRole("button", { name: "labelUseFile" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(await screen.findByRole("button", { name: "file.txt" }));
  fireEvent.click(screen.getByRole("button", { name: "labelUseFile" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("alert").textContent).toBe("errorCollision");
  expect(close).not.toHaveBeenCalled();
  expect(select).toHaveBeenCalledWith({ storage, path: "file.txt", file });
  expect(browse).toHaveBeenCalledWith({ storage, path: "", mode: "read" });
});
it("never confirms an inaccessible folder and permits a load retry", async () => {
  browse.mockResolvedValueOnce({ serverError: "denied" });
  const select = vi.fn();
  render(
    <StoragePickerDialog
      open
      onOpenChange={vi.fn()}
      currentStorage={storage}
      mode="folder"
      onSelect={select}
    />,
  );
  await screen.findByRole("alert");
  expect(
    (
      screen.getByRole("button", {
        name: "labelUseFolder",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "labelRetry" }));
  await screen.findByRole("button", { name: "folder" });
  expect(select).not.toHaveBeenCalled();
});
it("disables repeat submissions and closing while a transfer is pending", async () => {
  let finish!: () => void;
  const select = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const close = vi.fn();
  render(
    <StoragePickerDialog
      open
      onOpenChange={close}
      currentStorage={storage}
      mode="folder"
      onSelect={select}
    />,
  );
  await screen.findByRole("button", { name: "folder" });
  fireEvent.click(screen.getByRole("button", { name: "labelUseFolder" }));
  await screen.findByText("descriptionPending");
  expect(
    (screen.getByRole("button", { name: "labelCancel" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "labelUseFolder" }));
  expect(select).toHaveBeenCalledOnce();
  await act(async () => finish());
  expect(close).toHaveBeenCalledWith(false);
});
