// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteErrors,
  getServerSnapshot,
  getSnapshot,
  logError,
  setSendError,
  setSendErrors,
  subscribe,
} from "../packages/ui/src/components/error-log";
const key = "ai.schorn.aibox.package.ui.v1.error-logs";
beforeEach(() => {
  localStorage.clear();
  deleteErrors();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
describe("persisted error logs", () => {
  it("persists errors, caches snapshots, notifies subscribers and unsubscribes", () => {
    const listener = vi.fn();
    const stop = subscribe(listener);
    const before = getSnapshot();
    expect(getSnapshot()).toBe(before);
    logError("request", new Error("failed", { cause: "connection lost" }));
    const [entry] = getSnapshot();
    expect(entry).toMatchObject({
      hint: "request",
      send: true,
      message: expect.stringContaining("connection lost"),
    });
    expect(entry.date).toBeInstanceOf(Date);
    expect(JSON.parse(localStorage.getItem(key)!).errorLogs[0].hint).toBe(
      "request",
    );
    expect(listener).toHaveBeenCalledOnce();
    stop();
    setSendError(entry.id, false);
    expect(getSnapshot()[0].send).toBe(false);
    expect(listener).toHaveBeenCalledOnce();
  });
  it("updates only the selected entry, can mute all and delete all", () => {
    logError("a", "a");
    logError("b", { status: 500 });
    const [a, b] = getSnapshot();
    setSendError(a.id, false);
    expect(getSnapshot().map((x) => x.send)).toEqual([false, true]);
    setSendError("absent", false);
    expect(getSnapshot()[1].id).toBe(b.id);
    setSendErrors(false);
    expect(getSnapshot().every((x) => !x.send)).toBe(true);
    setSendErrors(true);
    expect(getSnapshot().every((x) => x.send)).toBe(true);
    deleteErrors();
    expect(getSnapshot()).toEqual([]);
  });
  it("retains the most recent 100 records", () => {
    for (let i = 0; i < 105; i++) logError(String(i), i);
    expect(getSnapshot()).toHaveLength(100);
    expect(getSnapshot()[0].hint).toBe("5");
  });
  it("recovers invalid persisted JSON as a reportable error", () => {
    localStorage.setItem(key, "{broken");
    // Invalidating the cache through the public API would replace the broken data.
    // A fresh module represents a new application load.
    return importFresh().then((fresh) => {
      expect(fresh.getSnapshot()[0]).toMatchObject({
        hint: "getSnapshot()",
        send: true,
      });
      expect(fresh.getSnapshot()[0].message).toContain("Serialization");
      expect(JSON.parse(localStorage.getItem(key)!).errorLogs).toHaveLength(1);
    });
  });
  it("serializes circular and deep error causes without overflowing", () => {
    const circular = new Error("loop");
    circular.cause = circular;
    logError("circle", circular);
    expect(getSnapshot()[0].message).toContain("[Circular Reference]");
    let deep: Error = new Error("end");
    for (let i = 0; i < 15; i++) deep = new Error(`${i}`, { cause: deep });
    logError("deep", deep);
    expect(getSnapshot()[1].message).toContain("[Max Depth]");
    const blank = new Error();
    blank.name = "";
    blank.stack = "";
    logError("blank", blank);
    expect(getSnapshot()[2].message).toContain("[Empty Name]");
    expect(getSnapshot()[2].message).toContain("[Empty Message]");
    expect(getSnapshot()[2].message).toContain("[Empty Stack]");
  });
  it("handles unserializable objects and server environments", () => {
    const circular: any = {};
    circular.self = circular;
    logError("object", circular);
    expect(getSnapshot()[0].message).toContain("[Not Serializable]");
    vi.stubGlobal("localStorage", undefined);
    expect(getSnapshot()).toBe(getServerSnapshot());
    logError("server", "error");
    deleteErrors();
    expect(getSnapshot()).toEqual([]);
  });
});
async function importFresh() {
  vi.resetModules();
  return import("../packages/ui/src/components/error-log");
}
