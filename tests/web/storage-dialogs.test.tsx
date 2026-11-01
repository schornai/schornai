// @vitest-environment jsdom
import "./client-setup";
import { client } from "./client-setup";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StorageDialogCreateFolder } from "../../apps/web/app/_components/StorageDialogCreateFolder";
import { StorageDialogRemove } from "../../apps/web/app/_components/StorageDialogRemove";
import { DialogPickerIcons } from "../../apps/web/app/_components/DialogPickerIcons";
import { DeleteSSOProvider } from "../../apps/web/app/(settings)/settings/sso/_components/DeleteSSOProvider";
const data = vi.hoisted(() => ({
  basePathStorage: "",
  basePathApp: "/files",
  storage: { type: "repository", documentRepositoryId: "repo" },
}));
vi.mock("../../apps/web/app/_components/StorageViewProvider", () => ({
  useStorageView: () => data,
}));
vi.mock("../../apps/web/app/_actions/storageRemove", () => ({
  storageRemove: vi.fn(),
}));
vi.mock("../../apps/web/app/_actions/storageCreateFolders", () => ({
  storageCreateFolders: vi.fn(),
}));
vi.mock(
  "../../apps/web/app/(settings)/settings/sso/_actions/deleteSSOProvider",
  () => ({ deleteSSOProvider: vi.fn() }),
);
afterEach(cleanup);
beforeEach(() => client.execute.mockReset().mockResolvedValue({}));
it("creates folders under the current path and clears the completed input", async () => {
  const close = vi.fn();
  render(
    <StorageDialogCreateFolder
      open
      onOpenChange={close}
      basePath="/parent"
      storage={data.storage as any}
    />,
  );
  fireEvent.change(screen.getByPlaceholderText("placeholderFolderName"), {
    target: { value: "child" },
  });
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "labelCreate" })),
  );
  expect(client.execute).toHaveBeenCalledWith({
    basePath: "/parent",
    folderNames: ["child"],
    storage: data.storage,
  });
  expect(close).toHaveBeenCalledWith(false);
  expect(
    (screen.getByPlaceholderText("placeholderFolderName") as HTMLInputElement)
      .value,
  ).toBe("");
});
it.each(["file", "folder"] as const)(
  "removes a selected %s without navigating away from the current folder",
  async (type) => {
    data.basePathStorage = type === "file" ? "" : "/nested";
    const close = vi.fn();
    render(
      <StorageDialogRemove
        open
        onOpenChange={close}
        path="/nested/item"
        type={type}
      />,
    );
    expect(
      screen.getByRole("button", { name: /labelRemove/ }).textContent,
    ).toContain("item");
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: /labelRemove/ })),
    );
    expect(client.execute).toHaveBeenCalledWith({
      path: "/nested/item",
      storage: data.storage,
    });
    expect(close).toHaveBeenCalledWith(false);
  },
);
it("filters icon choices and reports a selection", async () => {
  const change = vi.fn();
  render(<DialogPickerIcons onValueChange={change} value="bot" />);
  fireEvent.click(screen.getByRole("button", { name: "buttonMoreIcons" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(screen.getByPlaceholderText("placeholderSearchIcons"), {
    target: { value: "FILE" },
  });
  expect(dialog.querySelectorAll("[data-icon]")).toHaveLength(1);
  fireEvent.click(dialog.querySelector("[data-icon=file]")!.closest("button")!);
  expect(change).toHaveBeenCalledWith("file");
});
it("deletes an SSO provider only after confirmation", async () => {
  render(<DeleteSSOProvider />);
  fireEvent.click(screen.getByRole("button", { name: "buttonRemove" }));
  await screen.findByRole("alertdialog");
  expect(client.execute).not.toHaveBeenCalled();
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "buttonDelete" })),
  );
  expect(client.execute).toHaveBeenCalledOnce();
});
