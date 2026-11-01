// @vitest-environment jsdom
import "./client-setup";
import { client } from "./client-setup";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
vi.mock("../../apps/web/app/_actions/storageCreateTextFile", () => ({
  storageCreateTextFile: vi.fn(),
}));
vi.mock("../../apps/web/app/_actions/storageFileAction", () => ({
  storageFileAction: vi.fn(),
}));
import { StorageDialogCreateTextFile } from "../../apps/web/app/_components/StorageDialogCreateTextFile";
import { StorageFileActions } from "../../apps/web/app/_components/StorageFileActions";
const storage = {
  type: "documentRepository",
  workspaceId: "workspace",
  documentRepositoryId: "repo",
} as const;
const file = {
  file: true,
  name: "notes.txt",
  path: "notes.txt",
  type: "text/plain",
  size: 3,
  createdAtISO: "2026-10-17",
  updatedAtISO: "2026-10-17",
} as const;
afterEach(cleanup);
beforeEach(() => {
  client.execute.mockReset();
  client.push.mockReset();
  client.refresh.mockReset();
  client.pending = false;
});
const fill = () => {
  fireEvent.change(screen.getByLabelText("labelName"), {
    target: { value: "new.txt" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "labelCreate" }).closest("form")!,
  );
};
it("creates a text file and closes only after successful saving", async () => {
  const close = vi.fn();
  client.execute.mockResolvedValue({ data: { file, processing: "queued" } });
  render(
    <StorageDialogCreateTextFile
      storage={storage}
      basePath="folder"
      open
      onOpenChange={close}
    />,
  );
  fill();
  await waitFor(() => expect(close).toHaveBeenCalledWith(false));
  expect(client.execute).toHaveBeenCalledWith({
    storage,
    basePath: "folder",
    name: "new.txt",
  });
  expect(client.refresh).toHaveBeenCalled();
  expect(client.push).toHaveBeenCalledWith(
    "/app/documents/repo/files/notes.txt?view=edit",
  );
});
it("retains filename and content after validation or server failure", async () => {
  const close = vi.fn();
  client.execute.mockResolvedValue({ serverError: "collision" });
  render(
    <StorageDialogCreateTextFile
      storage={storage}
      basePath=""
      open
      onOpenChange={close}
    />,
  );
  fill();
  await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  expect(screen.getByDisplayValue("new.txt")).toBeTruthy();
  expect(close).not.toHaveBeenCalled();
});
it("leaves unknown extensions in the folder without opening an editor", async () => {
  client.execute.mockResolvedValue({
    data: { file: { ...file, name: "new.weird", path: "new.weird" } },
  });
  const close = vi.fn();
  render(
    <StorageDialogCreateTextFile
      storage={storage}
      basePath=""
      open
      onOpenChange={close}
    />,
  );
  fill();
  await waitFor(() => expect(close).toHaveBeenCalledWith(false));
  expect(client.push).not.toHaveBeenCalled();
});
it("does not save on cancel and disables submission while pending", () => {
  const close = vi.fn();
  const { rerender } = render(
    <StorageDialogCreateTextFile
      storage={storage}
      basePath=""
      open
      onOpenChange={close}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "labelCancel" }));
  expect(client.execute).not.toHaveBeenCalled();
  expect(close).toHaveBeenCalledWith(false);
  client.pending = true;
  rerender(
    <StorageDialogCreateTextFile
      storage={storage}
      basePath=""
      open
      onOpenChange={close}
    />,
  );
  expect(
    (screen.getByRole("button", { name: "labelCreate" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});
it("offers downloads and copying but no source mutations to a reader", async () => {
  render(<StorageFileActions file={file} storage={storage} />);
  const trigger = screen.getByRole("button", { name: "labelActions" });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  await screen.findByRole("menu");
  expect(
    (
      await screen.findByRole("menuitem", { name: "labelDownloadOriginal" })
    ).getAttribute("href"),
  ).toContain("format=original");
  expect(
    screen
      .getByRole("menuitem", { name: "labelDownloadProcessed" })
      .getAttribute("href"),
  ).toContain("format=processed");
  expect(screen.getByRole("menuitem", { name: "labelCopy" })).toBeTruthy();
  expect(screen.queryByRole("menuitem", { name: "labelMove" })).toBeNull();
  expect(screen.queryByRole("menuitem", { name: "labelDelete" })).toBeNull();
  expect(screen.queryByRole("menuitem", { name: "labelRename" })).toBeNull();
});
it("requires confirmation for deletion and navigates only after success", async () => {
  client.execute
    .mockResolvedValueOnce({ serverError: "failed" })
    .mockResolvedValueOnce({ data: { deleted: true } });
  render(
    <StorageFileActions
      file={file}
      storage={storage}
      canWrite
      navigateAfterChange
    />,
  );
  const trigger = screen.getByRole("button", { name: "labelActions" });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  await screen.findByRole("menu");
  await userEvent.click(
    await screen.findByRole("menuitem", { name: "labelDelete" }),
  );
  expect(client.execute).not.toHaveBeenCalled();
  fireEvent.submit(
    screen.getByRole("button", { name: "labelConfirm" }).closest("form")!,
  );
  await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  expect(client.push).not.toHaveBeenCalled();
  fireEvent.submit(
    screen.getByRole("button", { name: "labelConfirm" }).closest("form")!,
  );
  await waitFor(() =>
    expect(client.push).toHaveBeenCalledWith("/app/documents/repo/files/"),
  );
  expect(client.execute).toHaveBeenLastCalledWith({
    storage,
    path: "notes.txt",
    action: "delete",
    newName: "notes.txt",
  });
});
it("blocks changes while the file is being processed", async () => {
  render(<StorageFileActions file={file} storage={storage} canWrite busy />);
  const trigger = screen.getByRole("button", { name: "labelActions" });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  await screen.findByRole("menu");
  for (const name of ["labelRename", "labelProcess", "labelDelete"])
    expect(
      (await screen.findByRole("menuitem", { name })).getAttribute(
        "aria-disabled",
      ),
    ).toBe("true");
});
