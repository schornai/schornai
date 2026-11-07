import { expect, it, vi } from "vitest";

const electron = vi.hoisted(() => ({
  contextBridge: { exposeInMainWorld: vi.fn() },
  ipcRenderer: { invoke: vi.fn(), on: vi.fn(), removeListener: vi.fn() },
}));
vi.mock("electron", () => electron);

it("exposes commands and removable log subscriptions without exposing IPC events", async () => {
  await import("../apps/admin-mac/src/preload/exposeInMainWorld");
  const [name, api] = electron.contextBridge.exposeInMainWorld.mock.calls[0];
  expect(name).toBe("aiboxAdminAPI");
  electron.ipcRenderer.invoke.mockResolvedValue("started");
  await expect(api.command("start")).resolves.toBe("started");
  expect(electron.ipcRenderer.invoke).toHaveBeenCalledWith(
    "service:command",
    "start",
  );
  const callback = vi.fn();
  const unsubscribe = api.onRunBoxMessage(callback);
  const [channel, listener] = electron.ipcRenderer.on.mock.calls[0];
  expect(channel).toBe("service:log");
  const message = { type: "stdout", data: "ready" };
  listener({ sender: "private IPC sender" }, message);
  expect(callback).toHaveBeenCalledExactlyOnceWith(message);
  unsubscribe();
  expect(electron.ipcRenderer.removeListener).toHaveBeenCalledExactlyOnceWith(
    "service:log",
    listener,
  );
  electron.ipcRenderer.invoke.mockRejectedValue(
    new Error("service unavailable"),
  );
  await expect(api.command("stop")).rejects.toThrow("service unavailable");
});
