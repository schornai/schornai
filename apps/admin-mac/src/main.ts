import { app, BrowserWindow, ipcMain } from "electron";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";

const root = process.env.SCHORNAI_HOME ?? join(app.getPath("home"), ".aibox");
const configPath = process.env.SCHORNAI_CONFIG ?? join(root, "config.json");
const bundledNode = join(root, "bin/node/node");
const node =
  process.env.SCHORNAI_NODE ?? (existsSync(bundledNode) ? bundledNode : "node");
const cli =
  process.env.SCHORNAI_CLI ??
  (app.isPackaged
    ? join(root, "apps/service/cli.mjs")
    : resolve(__dirname, "../../../../packages/service/dist/cli.mjs"));
let window: BrowserWindow | undefined;
let logProcess: ChildProcess | undefined;
let pending: Promise<string> | undefined;

function command(action: "start" | "stop" | "status") {
  return new Promise<string>((resolveCommand, reject) => {
    const child = spawn(
      node,
      [cli, "service", action, "--config", configPath, "--json"],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let output = "";
    let errors = "";
    child.stdout.on("data", (chunk: Buffer) => {
      output = (output + chunk.toString()).slice(-16_384);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      errors = (errors + chunk.toString()).slice(-16_384);
    });
    child.once("error", reject);
    child.once("close", (code) =>
      code === 0
        ? resolveCommand(output.trim())
        : reject(new Error(errors || "Service command failed")),
    );
  });
}
function followLogs() {
  if (logProcess) return;
  logProcess = spawn(
    node,
    [
      cli,
      "service",
      "logs",
      "--config",
      configPath,
      "--follow",
      "--json",
      "--lines",
      "500",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  const reader = createInterface({ input: logProcess.stdout! });
  reader.on("line", (line) => {
    try {
      window?.webContents.send("service:log", JSON.parse(line));
    } catch {
      /* Ignore partial log lines. */
    }
  });
  logProcess.on("error", (error) =>
    window?.webContents.send("service:log", {
      level: "stderr",
      sender: "launcher",
      timestampISO: new Date().toISOString(),
      message: error.message,
    }),
  );
  logProcess.stderr?.resume();
  logProcess.once("close", () => {
    logProcess = undefined;
  });
}
async function createWindow() {
  window = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.on("closed", () => {
    window = undefined;
    logProcess?.kill();
    logProcess = undefined;
  });
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL)
    await window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  else
    await window.loadFile(
      join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  followLogs();
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  ipcMain.handle("service:command", async (event, action: unknown) => {
    if (
      event.sender !== window?.webContents ||
      event.senderFrame !== window.webContents.mainFrame ||
      !["start", "stop", "status"].includes(String(action))
    )
      throw new Error("Invalid service command");
    if (action === "status") return command("status");
    if (pending) return pending;
    pending = command(action as "start" | "stop").finally(() => {
      pending = undefined;
    });
    return pending;
  });
  app.on("ready", () => {
    void createWindow();
  });
  app.on("activate", () => {
    if (!window) void createWindow();
  });
  app.on("second-instance", () => {
    window?.show();
    window?.focus();
  });
  app.on("before-quit", () => logProcess?.kill());
}
