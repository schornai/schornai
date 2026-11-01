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
vi.mock("../../apps/web/app/_actions/storageUpdateFileText", () => ({
  storageUpdateFileText: vi.fn(),
}));
import { StorageFileEditor } from "../../apps/web/app/_components/StorageFileEditor";
const props = {
  file: {
    file: true as const,
    name: "note.txt",
    path: "note.txt",
    type: "text/plain",
    size: 4,
    createdAtISO: "2026-10-17",
    updatedAtISO: "2026-10-17",
  },
  storage: { type: "activity" as const, agentId: "agent", activityId: "chat" },
  content: { type: "mdc" as const, current: "before", versions: [] },
};
afterEach(cleanup);
beforeEach(() => {
  client.execute.mockReset();
  client.replace.mockReset();
  client.pending = false;
});
it("submits the current text with its expected version and leaves after success", async () => {
  client.execute.mockResolvedValue({
    data: { status: "saved", indexQueued: true },
  });
  render(<StorageFileEditor {...props} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "after" } });
  fireEvent.click(screen.getByRole("button", { name: "labelSave" }));
  await waitFor(() => expect(client.replace).toHaveBeenCalled());
  expect(client.execute).toHaveBeenCalledWith({
    storage: props.storage,
    path: "note.txt",
    text: "after",
    expectedText: "before",
  });
});
it("keeps edits visible on conflict and never saves on cancel", async () => {
  client.execute.mockResolvedValue({ data: { status: "conflict" } });
  render(<StorageFileEditor {...props} />);
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "my edit" },
  });
  fireEvent.click(screen.getByRole("button", { name: "labelSave" }));
  await screen.findByText("errorConflict");
  expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(
    "my edit",
  );
  expect(client.replace).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "labelCancel" }));
  expect(client.execute).toHaveBeenCalledTimes(1);
  expect(client.replace).toHaveBeenCalled();
});
