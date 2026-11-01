import { broadcastIPCMessage } from "./lib/broadcastIPCMessage";
import { findLocalBoxes } from "./lib/findLocalBoxes";
import { ipcMain } from "electron";
import { trustedBox } from "./trustedBox";

export function setupIPC() {
  ipcMain.handle("findBoxes", () => {
    void (async () => {
      const boxes: BoxEndpoint[] = [];
      for await (const box of findLocalBoxes()) {
        broadcastIPCMessage("findBoxes:found", box);
        boxes.push(box);
      }
      broadcastIPCMessage("findBoxes:finished", boxes);
    })();
  });

  ipcMain.handle("trustBox", (_eventArgs, box) => {
    trustedBox.setBox(box as BoxEndpoint);
  });

  ipcMain.handle("getTrustedBox", () => {
    return trustedBox.getBox();
  });
}
