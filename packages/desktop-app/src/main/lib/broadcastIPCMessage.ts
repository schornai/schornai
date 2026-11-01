import { BrowserWindow } from 'electron';

export function broadcastIPCMessage(channel: string, ...args: unknown[]) {
  const windows = BrowserWindow.getAllWindows();
  for (const window of windows) {
    window.webContents.send(channel, ...args);
  }
}
