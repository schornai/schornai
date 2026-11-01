import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("aiboxDesktopAPI", {
  findLocalBoxes({ onBoxFound, onFinished }) {
    ipcRenderer.on("findBoxes:found", (_eventArgs, box: BoxEndpoint) => {
      onBoxFound?.(box);
    });

    ipcRenderer.on("findBoxes:finished", (_eventArgs, boxes: BoxEndpoint[]) => {
      onFinished?.(boxes);
    });

    void ipcRenderer.invoke("findBoxes");
  },

  async getTrustedBox() {
    return (await ipcRenderer.invoke("getTrustedBox")) as BoxEndpoint;
  },

  async trustBox(box) {
    await ipcRenderer.invoke("trustBox", box);
  },
} satisfies typeof window.aiboxDesktopAPI);
