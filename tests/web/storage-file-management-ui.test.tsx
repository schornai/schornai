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
vi.mock("../../apps/web/app/_actions/storageTransferFile", () => ({
  storageTransferFile: vi.fn(),
}));
vi.mock("../../apps/web/app/_actions/storageBrowse", () => ({
  storageBrowse: vi.fn(),
}));
import { storageTransferFile } from "../../apps/web/app/_actions/storageTransferFile";
import { storageBrowse } from "../../apps/web/app/_actions/storageBrowse";
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
  vi.mocked(storageTransferFile).mockReset();
  vi.mocked(storageBrowse)
    .mockReset()
    .mockResolvedValue({
      data: {
        repositories: [],
        files: [{ folder: true, path: "destination", name: "destination" }],
      },
    } as any);
});

async function chooseAction(name: string, triggerName = "labelActions") {
  const trigger = screen.getByRole("button", { name: triggerName });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  await userEvent.click(await screen.findByRole("menuitem", { name }));
}
function confirm() {
  fireEvent.submit(
    screen.getByRole("button", { name: "labelConfirm" }).closest("form")!,
  );
}

it("keeps a failed rename draft and navigates to the saved path only after retry succeeds", async () => {
  client.execute.mockResolvedValueOnce(undefined).mockResolvedValueOnce({
    data: {
      file: { ...file, name: "renamed.txt", path: "folder/renamed.txt" },
    },
  });
  render(
    <StorageFileActions
      file={file}
      storage={storage}
      canWrite
      navigateAfterChange
    />,
  );
  await chooseAction("labelRename");
  fireEvent.change(screen.getByLabelText("labelName"), {
    target: { value: "renamed.txt" },
  });
  confirm();
  await screen.findByRole("alert");
  expect(screen.getByDisplayValue("renamed.txt")).toBeTruthy();
  expect(client.push).not.toHaveBeenCalled();
  confirm();
  await waitFor(() =>
    expect(client.push).toHaveBeenCalledWith(
      "/app/documents/repo/files/folder/renamed.txt",
    ),
  );
  expect(client.execute).toHaveBeenLastCalledWith({
    action: "rename",
    storage,
    path: "notes.txt",
    newName: "renamed.txt",
  });
});

it.each(["unsupported", "queued", "alreadyQueued"])(
  "reports processing outcome %s without navigating away",
  async (processing) => {
    client.execute.mockResolvedValue({ data: { processing } });
    render(
      <StorageFileActions
        file={file}
        storage={storage}
        canWrite
        navigateAfterChange
      />,
    );
    await chooseAction("labelProcess");
    expect(screen.getByText("descriptionProcess")).toBeTruthy();
    confirm();
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe(
        processing === "unsupported"
          ? "descriptionUnsupported"
          : "descriptionQueued",
      ),
    );
    expect(client.push).not.toHaveBeenCalled();
    expect(client.refresh).toHaveBeenCalledOnce();
  },
);

it("opens the editor from the options menu using an encoded file path", async () => {
  render(
    <StorageFileActions
      file={{ ...file, path: "folder/my file#.txt" }}
      storage={storage}
      canWrite
      editable
      options
    />,
  );
  await chooseAction("labelEdit", "labelOptions");
  expect(client.push).toHaveBeenCalledWith(
    "/app/documents/repo/files/folder/my%20file%23.txt?view=edit",
  );
});

it("omits processed downloads and processing for an unsupported binary file", async () => {
  render(
    <StorageFileActions
      file={{ ...file, path: "unknown.xyz" }}
      storage={storage}
      canWrite
    />,
  );
  const trigger = screen.getByRole("button", { name: "labelActions" });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  await screen.findByRole("menu");
  expect(
    screen.queryByRole("menuitem", { name: "labelDownloadProcessed" }),
  ).toBeNull();
  expect(screen.queryByRole("menuitem", { name: "labelProcess" })).toBeNull();
});

it("cancels a rename without sending it and ignores duplicate submissions while pending", async () => {
  const props = { file, storage, canWrite: true };
  const { rerender } = render(<StorageFileActions {...props} />);
  await chooseAction("labelRename");
  fireEvent.click(screen.getByRole("button", { name: "labelCancel" }));
  expect(client.execute).not.toHaveBeenCalled();
  await chooseAction("labelRename");
  client.pending = true;
  rerender(<StorageFileActions {...props} />);
  confirm();
  expect(client.execute).not.toHaveBeenCalled();
  expect(
    (screen.getByLabelText("labelName") as HTMLInputElement).disabled,
  ).toBe(true);
});

it.each([
  { move: false, navigate: false, processing: "queued", portal: false },
  { move: true, navigate: false, processing: "queued", portal: false },
  { move: true, navigate: true, processing: "error", portal: true },
])(
  "transfers a file with move=$move and reports processing=$processing",
  async ({ move, navigate, processing, portal }) => {
    vi.mocked(storageTransferFile).mockResolvedValue({
      data: { result: { processing } },
    } as any);
    render(
      <StorageFileActions
        file={{ ...file, path: "source/notes.txt" }}
        storage={storage}
        canWrite
        navigateAfterChange={navigate}
      >
        {portal ? (actions) => <div>{actions}</div> : undefined}
      </StorageFileActions>,
    );
    await chooseAction(move ? "labelMove" : "labelCopy");
    await screen.findByRole("button", { name: "destination" });
    fireEvent.click(screen.getByRole("button", { name: "labelUseFolder" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe(
        processing === "error"
          ? "descriptionTransferProcessingError"
          : "descriptionTransferred",
      ),
    );
    expect(storageTransferFile).toHaveBeenCalledWith({
      from: { storage, path: "source/notes.txt" },
      to: { storage, folder: "" },
      move,
    });
    expect(client.push.mock.calls).toEqual(
      move && navigate ? [["/app/documents/repo/files/source"]] : [],
    );
    expect(client.refresh).toHaveBeenCalledOnce();
  },
);

it.each([undefined, { data: {} }, { data: { error: "FILE_ALREADY_EXISTS" } }])(
  "retains the destination picker after a failed transfer",
  async (response) => {
    vi.mocked(storageTransferFile).mockResolvedValue(response as any);
    render(<StorageFileActions file={file} storage={storage} canWrite />);
    await chooseAction("labelCopy");
    await screen.findByRole("button", { name: "destination" });
    fireEvent.click(screen.getByRole("button", { name: "labelUseFolder" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(client.refresh).not.toHaveBeenCalled();
    expect(client.push).not.toHaveBeenCalled();
  },
);
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
