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
import userEvent from "@testing-library/user-event";
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

it.each([
  [new Error("FILE_NOT_PROCESSED"), "errorNotProcessed"],
  [new Error("SOURCE_EQUALS_TARGET"), "errorSameTarget"],
  [new Error("SOURCE_CHANGED_DURING_COPY"), "errorSourceChanged"],
  [new Error("FILE_PROCESSING_IN_PROGRESS"), "errorBusy"],
  [new Error("STORAGE_NOT_AUTHORIZED"), "errorPermission"],
  [new Error("COPIED_SOURCE_DELETE_FAILED"), "errorSourceDelete"],
  [new Error("COPY_FAILED_TARGET_CLEANUP_REQUIRED"), "errorCleanup"],
  [new Error("TARGET_FOLDER_NOT_FOUND"), "errorLoad"],
  [new Error("private backend detail"), "errorAction"],
  [null, "errorAction"],
])(
  "presents a safe transfer error and keeps the dialog open (%s)",
  async (failure, message) => {
    const close = vi.fn();
    render(
      <StoragePickerDialog
        open
        currentStorage={storage}
        mode="folder"
        onOpenChange={close}
        onSelect={vi.fn().mockRejectedValue(failure)}
      />,
    );
    await screen.findByRole("button", { name: "folder" });
    fireEvent.click(screen.getByRole("button", { name: "labelUseFolder" }));
    expect((await screen.findByRole("alert")).textContent).toBe(message);
    expect(close).not.toHaveBeenCalled();
  },
);

it("shows an empty repository list and allows cancellation without submitting", async () => {
  const close = vi.fn(),
    select = vi.fn();
  render(
    <StoragePickerDialog
      open
      mode="file"
      title="Choose a source"
      description="Available documents"
      onOpenChange={close}
      onSelect={select}
    />,
  );
  await screen.findByText("descriptionNoStorages");
  expect(screen.getByRole("heading").textContent).toBe("Choose a source");
  expect(
    (screen.getByRole("button", { name: "labelUseFile" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "labelCancel" }));
  expect(close).toHaveBeenCalledWith(false);
  expect(select).not.toHaveBeenCalled();
});

it("switches from activity storage to a named repository and navigates back to its root", async () => {
  browse.mockImplementation(async (input) => ({
    data: {
      repositories: [
        {
          id: "repo",
          workspaceId: "workspace",
          workspaceName: "Team",
          name: "Documents",
        },
        { id: "other", workspaceId: "workspace", name: "Other" },
      ],
      files: input.storage ? (input.path ? [] : [folder]) : [],
    },
  }));
  const activity = {
    type: "activity",
    activityId: "chat",
    agentId: "agent",
  } as const;
  render(
    <StoragePickerDialog
      open
      currentStorage={activity}
      mode="folder"
      onOpenChange={vi.fn()}
      onSelect={vi.fn()}
    />,
  );
  await screen.findByRole("button", { name: "folder" });
  await userEvent.click(screen.getByRole("combobox"));
  await userEvent.click(
    await screen.findByRole("option", { name: "Documents · Team" }),
  );
  await waitFor(() =>
    expect(browse).toHaveBeenLastCalledWith({
      storage,
      path: "",
      mode: "write",
    }),
  );
  fireEvent.click(await screen.findByRole("button", { name: "folder" }));
  await screen.findByText("descriptionEmpty");
  fireEvent.click(screen.getByRole("button", { name: "labelUp" }));
  await screen.findByRole("button", { name: "folder" });
  expect(browse).toHaveBeenLastCalledWith({ storage, path: "", mode: "write" });
});

it("does not display a late browse response after the dialog closes and reopens", async () => {
  let finish!: (result: unknown) => void;
  browse.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const props = {
    onOpenChange: vi.fn(),
    onSelect: vi.fn(),
    mode: "folder" as const,
  };
  const view = render(<StoragePickerDialog {...props} open />);
  view.rerender(<StoragePickerDialog {...props} open={false} />);
  view.rerender(<StoragePickerDialog {...props} open />);
  await screen.findByText("descriptionNoStorages");
  await act(async () =>
    finish({
      data: {
        repositories: [
          { id: "stale", name: "Stale", workspaceId: "workspace" },
        ],
        files: [],
      },
    }),
  );
  expect(screen.queryByText("Stale")).toBeNull();
  expect(browse).toHaveBeenCalledTimes(2);
});

it.each([false, true])(
  "ignores a stale folder request after reopening (reject=%s)",
  async (reject) => {
    const pending = Promise.withResolvers<any>();
    browse.mockImplementation(async (input) =>
      input.path
        ? pending.promise
        : { data: { repositories: [], files: input.storage ? [folder] : [] } },
    );
    const props = {
      currentStorage: storage,
      mode: "folder" as const,
      onOpenChange: vi.fn(),
      onSelect: vi.fn(),
    };
    const view = render(<StoragePickerDialog {...props} open />);
    fireEvent.click(await screen.findByRole("button", { name: "folder" }));
    await screen.findByText("descriptionLoading");
    view.rerender(<StoragePickerDialog {...props} open={false} />);
    view.rerender(<StoragePickerDialog {...props} open />);
    await screen.findByRole("button", { name: "folder" });
    await act(async () => {
      if (reject) pending.reject(new Error("late error"));
      else
        pending.resolve({
          data: {
            repositories: [],
            files: [{ folder: true, path: "stale", name: "Stale" }],
          },
        });
    });
    expect(screen.queryByText("Stale")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  },
);

it("retries a failed folder load without accepting an inaccessible destination", async () => {
  browse
    .mockResolvedValueOnce({ data: { repositories: [], files: [] } })
    .mockResolvedValueOnce(undefined);
  render(
    <StoragePickerDialog
      open
      currentStorage={storage}
      mode="folder"
      onOpenChange={vi.fn()}
      onSelect={vi.fn()}
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
  expect(screen.queryByRole("alert")).toBeNull();
  expect(browse).toHaveBeenLastCalledWith({ storage, path: "", mode: "write" });
});
