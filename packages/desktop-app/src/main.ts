import { BrowserWindow, app } from "electron";
import path from "path";
import { setupIPC } from "./main/setupIPC";
import started from "electron-squirrel-startup";
import { trustedBox } from "./main/trustedBox";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 700,
    titleBarOverlay: process.platform !== "darwin",
    titleBarStyle: "hidden",
    webPreferences: {
      partition: "persist:schornai",
      preload: path.join(__dirname, "preload.cjs"),
      webviewTag: true,
    },
    width: 1200,
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools if in development mode.
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

void app.whenReady().then(() => {
  setupIPC();
});

app.on(
  "certificate-error",
  (event, _webContents, urlString, _error, certificate, callback) => {
    const url = new URL(urlString);
    if (trustedBox.isTrusted(url.hostname, certificate)) {
      event.preventDefault();
      callback(true);
      return;
    }

    callback(false);
  },
);
