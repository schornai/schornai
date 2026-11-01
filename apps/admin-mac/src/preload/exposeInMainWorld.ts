import { contextBridge, ipcRenderer } from "electron";
import type { ChildProcessMessage } from "../types";

contextBridge.exposeInMainWorld("aiboxAdminAPI", {
  command: (action) =>
    ipcRenderer.invoke("service:command", action) as Promise<string>,
  onRunBoxMessage(callback) {
    const listener = (
      _event: Electron.IpcRendererEvent,
      message: ChildProcessMessage,
    ) => callback(message);
    ipcRenderer.on("service:log", listener);
    return () => ipcRenderer.removeListener("service:log", listener);
  },
} satisfies Window["aiboxAdminAPI"]);
