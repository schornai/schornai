import { EventEmitter } from "node:events";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  app: undefined as any,
  windows: [] as any[],
  handle: vi.fn(),
  spawn: vi.fn(),
  exists: vi.fn(),
  reader: vi.fn(),
}));
vi.mock("electron", async () => {
  const { EventEmitter } = await import("node:events");
  return {
    get app() {
      return mocks.app;
    },
    ipcMain: { handle: mocks.handle },
    BrowserWindow: class extends EventEmitter {
      webContents = Object.assign(new EventEmitter(), {
        mainFrame: {},
        send: vi.fn(),
        setWindowOpenHandler: vi.fn(),
      });
      loadURL = vi.fn(async () => {});
      loadFile = vi.fn(async () => {});
      show = vi.fn();
      focus = vi.fn();
      constructor(public options: any) {
        super();
        mocks.windows.push(this);
      }
    },
  };
});
vi.mock("node:fs", async (original) => ({
  ...(await original<any>()),
  existsSync: mocks.exists,
}));
vi.mock("node:child_process", () => ({ spawn: mocks.spawn }));
vi.mock("node:readline", () => ({ createInterface: mocks.reader }));
const children: any[] = [];
const readers: EventEmitter[] = [];
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.windows.length = 0;
  children.length = 0;
  readers.length = 0;
  mocks.app = Object.assign(new EventEmitter(), {
    isPackaged: true,
    getPath: vi.fn(() => "/example/home"),
    requestSingleInstanceLock: vi.fn(() => true),
    quit: vi.fn(),
  });
  mocks.exists.mockReturnValue(true);
  mocks.spawn.mockImplementation(() => {
    const child = Object.assign(new EventEmitter(), {
      stdout: new EventEmitter(),
      stderr: Object.assign(new EventEmitter(), { resume: vi.fn() }),
      kill: vi.fn(),
    });
    children.push(child);
    return child;
  });
  mocks.reader.mockImplementation(() => {
    const reader = new EventEmitter();
    readers.push(reader);
    return reader;
  });
  for (const key of [
    "SCHORNAI_HOME",
    "SCHORNAI_CONFIG",
    "SCHORNAI_NODE",
    "SCHORNAI_CLI",
  ])
    vi.stubEnv(key, undefined);
  vi.stubGlobal("MAIN_WINDOW_VITE_DEV_SERVER_URL", "");
  vi.stubGlobal("MAIN_WINDOW_VITE_NAME", "main_window");
  vi.stubGlobal("__dirname", "/example/app/main");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
async function ready() {
  await import("../apps/admin-mac/src/main");
  mocks.app.emit("ready");
  await Promise.resolve();
  const window = mocks.windows[0];
  return {
    window,
    command: mocks.handle.mock.calls[0][1],
    event: {
      sender: window.webContents,
      senderFrame: window.webContents.mainFrame,
    },
  };
}
it("opens an isolated packaged window, blocks navigation and forwards structured logs", async () => {
  const { window } = await ready();
  expect(window.options.webPreferences).toMatchObject({
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
  });
  expect(window.loadFile).toHaveBeenCalledWith(
    expect.stringContaining("main_window/index.html"),
  );
  expect(window.webContents.setWindowOpenHandler.mock.calls[0][0]()).toEqual({
    action: "deny",
  });
  const preventDefault = vi.fn();
  window.webContents.emit("will-navigate", { preventDefault });
  expect(preventDefault).toHaveBeenCalledOnce();
  readers[0].emit("line", JSON.stringify({ message: "safe log" }));
  readers[0].emit("line", "partial {");
  expect(window.webContents.send).toHaveBeenCalledTimes(1);
  expect(window.webContents.send).toHaveBeenCalledWith("service:log", {
    message: "safe log",
  });
  children[0].emit("error", new Error("log stream lost"));
  expect(window.webContents.send).toHaveBeenLastCalledWith(
    "service:log",
    expect.objectContaining({ level: "stderr", message: "log stream lost" }),
  );
  mocks.app.emit("second-instance");
  expect(window.show).toHaveBeenCalledOnce();
  expect(window.focus).toHaveBeenCalledOnce();
  mocks.app.emit("activate");
  expect(mocks.windows).toHaveLength(1);
  mocks.app.emit("before-quit");
  expect(children[0].kill).toHaveBeenCalled();
  window.emit("closed");
  expect(children[0].kill).toHaveBeenCalled();
  mocks.app.emit("second-instance");
  mocks.app.emit("before-quit");
  mocks.app.emit("activate");
  await Promise.resolve();
  expect(mocks.windows).toHaveLength(2);
  expect(children).toHaveLength(2);
});
it("rejects forged IPC senders, subframes and unsupported commands", async () => {
  const { command, event } = await ready();
  for (const [source, action] of [
    [{ ...event, sender: {} }, "start"],
    [{ ...event, senderFrame: {} }, "start"],
    [event, "delete"],
  ]) {
    await expect(command(source, action)).rejects.toThrow(
      "Invalid service command",
    );
  }
  expect(children).toHaveLength(1);
});
it("coalesces mutations, allows concurrent status reads and bounds subprocess output", async () => {
  const { command, event } = await ready();
  const start = command(event, "start");
  const duplicate = command(event, "stop");
  const status = command(event, "status");
  expect(children).toHaveLength(3);
  children[1].stdout.emit("data", Buffer.from("x".repeat(20_000) + " done"));
  children[1].emit("close", 0);
  const result = await start;
  expect(result.length).toBe(16_384);
  expect(result.endsWith("done")).toBe(true);
  expect(await duplicate).toBe(result);
  children[2].stdout.emit("data", Buffer.from(" ready \n"));
  children[2].emit("close", 0);
  await expect(status).resolves.toBe("ready");
  const stop = command(event, "stop");
  children[3].emit("close", 0);
  await stop;
  expect(mocks.spawn.mock.calls[1][1]).toContain("start");
  expect(mocks.spawn.mock.calls[3][1]).toContain("stop");
});
it.each(["stderr", "empty", "spawn"])(
  "reports %s command failure and allows another attempt",
  async (mode) => {
    const { command, event } = await ready();
    const promise = command(event, "start");
    const expected =
      mode === "stderr"
        ? "details"
        : mode === "spawn"
          ? "missing executable"
          : "Service command failed";
    const rejected = expect(promise).rejects.toThrow(expected);
    if (mode === "spawn") children[1].emit("error", new Error(expected));
    else {
      if (mode === "stderr")
        children[1].stderr.emit("data", Buffer.from("details"));
      children[1].emit("close", 1);
    }
    await rejected;
    const retry = command(event, "start");
    children[2].emit("close", 0);
    await retry;
  },
);
it("honors configured paths and development URLs", async () => {
  vi.stubEnv("SCHORNAI_HOME", "/configured/home");
  vi.stubEnv("SCHORNAI_CONFIG", "/configured/settings.json");
  vi.stubEnv("SCHORNAI_NODE", "/configured/node");
  vi.stubEnv("SCHORNAI_CLI", "/configured/cli.mjs");
  vi.stubGlobal("MAIN_WINDOW_VITE_DEV_SERVER_URL", "http://localhost:5173");
  const { window } = await ready();
  expect(window.loadURL).toHaveBeenCalledWith("http://localhost:5173");
  expect(mocks.spawn).toHaveBeenCalledWith(
    "/configured/node",
    expect.arrayContaining([
      "/configured/cli.mjs",
      "/configured/settings.json",
    ]),
    expect.anything(),
  );
});
it("falls back to PATH Node and the source-checkout runtime when unpackaged", async () => {
  mocks.app.isPackaged = false;
  mocks.exists.mockReturnValue(false);
  const { window } = await ready();
  expect(mocks.spawn).toHaveBeenCalledWith(
    "node",
    expect.arrayContaining([
      expect.stringContaining("packages/service/dist/cli.mjs"),
    ]),
    expect.anything(),
  );
  children[0].emit("close", 0);
  window.emit("closed");
  mocks.app.emit("activate");
  await Promise.resolve();
  expect(children).toHaveLength(2);
});
it("quits when another instance owns the application lock", async () => {
  mocks.app.requestSingleInstanceLock.mockReturnValue(false);
  await import("../apps/admin-mac/src/main");
  expect(mocks.app.quit).toHaveBeenCalledOnce();
  expect(mocks.handle).not.toHaveBeenCalled();
  expect(mocks.windows).toHaveLength(0);
});
