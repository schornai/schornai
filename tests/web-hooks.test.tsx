// @vitest-environment jsdom
import { act, renderHook, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Doc } from "yjs";
import { TypedYMap } from "../packages/realtime/src/_lib/TypedYMap";
import { useRealtimeArray } from "../apps/web/lib/useRealtimeArray";
import { useRealtimeMap } from "../apps/web/lib/useRealtimeMap";
import { useRealtimeTypedMap } from "../apps/web/lib/useRealtimeTypedMap";
import { useRealtimeText } from "../apps/web/lib/useRealtimeText";
import { useFilter } from "../apps/web/lib/useFilter";
import { useDebounce } from "../packages/ui/src/hooks/use-debounce";
import { useDecayState } from "../packages/ui/src/hooks/use-decay-state";
import { useDecayActionState } from "../packages/ui/src/hooks/use-decay-action-state";
import { useIsMobile } from "../packages/ui/src/hooks/use-mobile";

afterEach(cleanup);

describe("realtime React subscriptions", () => {
  it("tracks array changes, replaces subscriptions and detaches on unmount", () => {
    const document = new Doc();
    const a = document.getArray<number>("a");
    const b = document.getArray<number>("b");
    a.push([1]);
    b.push([9]);
    const unobserve = vi.spyOn(a, "unobserve");
    const hook = renderHook(({ array }) => useRealtimeArray(array), {
      initialProps: { array: a },
    });
    expect(hook.result.current).toEqual([1]);
    act(() => a.push([2]));
    expect(hook.result.current).toEqual([1, 2]);
    hook.rerender({ array: b });
    expect(hook.result.current).toEqual([9]);
    expect(unobserve).toHaveBeenCalledOnce();
    hook.unmount();
    expect(renderHook(() => useRealtimeArray()).result.current).toEqual([]);
  });
  it("tracks maps and typed maps, including absent typed documents", () => {
    const document = new Doc();
    const map = document.getMap<number>("map");
    const typed = new TypedYMap<{ value: string }>(document.getMap("typed"));
    const mapHook = renderHook(() => useRealtimeMap(map));
    const typedHook = renderHook(() => useRealtimeTypedMap(typed));
    act(() => {
      map.set("a", 1);
      typed.set("value", "hello");
    });
    expect([...mapHook.result.current]).toEqual([["a", 1]]);
    expect(typedHook.result.current).toEqual({ value: "hello" });
    const stopMap = vi.spyOn(map, "unobserve");
    const stopTyped = vi.spyOn(typed, "unobserve");
    mapHook.unmount();
    typedHook.unmount();
    expect(stopMap).toHaveBeenCalledOnce();
    expect(stopTyped).toHaveBeenCalledOnce();
    expect(
      renderHook(() => useRealtimeTypedMap()).result.current,
    ).toBeUndefined();
  });
  it("tracks text edits and cleans up observers", () => {
    const document = new Doc();
    const text = document.getText("text");
    const hook = renderHook(() => useRealtimeText(text));
    expect(hook.result.current).toBe("");
    act(() => text.insert(0, "hello"));
    expect(hook.result.current).toBe("hello");
    const unobserve = vi.spyOn(text, "unobserve");
    hook.unmount();
    expect(unobserve).toHaveBeenCalledOnce();
    expect(renderHook(() => useRealtimeText()).result.current).toBe("");
  });
});

describe("timed UI state", () => {
  it("debounces the most recent value and clears pending timers on unmount", () => {
    vi.useFakeTimers();
    const hook = renderHook(({ value }) => useDebounce(value, 100), {
      initialProps: { value: "a" },
    });
    hook.rerender({ value: "b" });
    act(() => vi.advanceTimersByTime(99));
    expect(hook.result.current).toBe("a");
    hook.rerender({ value: "c" });
    act(() => vi.advanceTimersByTime(100));
    expect(hook.result.current).toBe("c");
    hook.rerender({ value: "d" });
    hook.unmount();
    expect(vi.getTimerCount()).toBe(0);
    const defaults = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: 0 },
    });
    defaults.rerender({ value: 1 });
    act(() => vi.advanceTimersByTime(1000));
    expect(defaults.result.current).toBe(1);
  });
  it("restarts the decay clock on successive updates and supports functional setters", () => {
    vi.useFakeTimers();
    const hook = renderHook(() => useDecayState(0, 100));
    act(() => hook.result.current[1](1));
    act(() => vi.advanceTimersByTime(50));
    act(() => hook.result.current[1]((prev) => prev + 1));
    act(() => vi.advanceTimersByTime(50));
    expect(hook.result.current[0]).toBe(2);
    act(() => vi.advanceTimersByTime(50));
    expect(hook.result.current[0]).toBe(0);
    act(() => hook.result.current[1](3));
    hook.unmount();
    expect(vi.getTimerCount()).toBe(0);
    renderHook(() => useDecayState(false)).unmount();
  });
  it("keeps success and error decay independent", () => {
    vi.useFakeTimers();
    const hook = renderHook(() => useDecayActionState(100));
    act(() => hook.result.current.actionUtils.onSuccess());
    act(() => vi.advanceTimersByTime(50));
    act(() => hook.result.current.actionUtils.onError());
    expect(hook.result.current).toMatchObject({
      hasSucceeded: true,
      hasErrored: true,
    });
    act(() => vi.advanceTimersByTime(50));
    expect(hook.result.current).toMatchObject({
      hasSucceeded: false,
      hasErrored: true,
    });
    act(() => vi.advanceTimersByTime(50));
    expect(hook.result.current.hasErrored).toBe(false);
  });
  it("filters fuzzy results after debounce and restores the source for an empty query", () => {
    vi.useFakeTimers();
    const data = [{ name: "Alpha" }, { name: "Beta" }];
    const hook = renderHook(() =>
      useFilter(data, { keys: ["name"], threshold: 0.1 }),
    );
    expect(hook.result.current.filteredData).toBe(data);
    act(() => hook.result.current.setFilter("Alpha"));
    expect(hook.result.current.filteredData).toBe(data);
    act(() => vi.advanceTimersByTime(250));
    expect(hook.result.current.filteredData).toEqual([data[0]]);
    act(() => hook.result.current.setFilter(""));
    act(() => vi.advanceTimersByTime(250));
    expect(hook.result.current.filteredData).toBe(data);
  });
  it("responds to the mobile breakpoint and removes the media listener", () => {
    const listeners = new Set<() => void>();
    const removeEventListener = vi.fn((_event, listener) =>
      listeners.delete(listener),
    );
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        addEventListener: (_event: string, listener: () => void) =>
          listeners.add(listener),
        removeEventListener,
      })),
    );
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 767,
    });
    const hook = renderHook(useIsMobile);
    expect(hook.result.current).toBe(true);
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 768,
    });
    act(() => listeners.forEach((listener) => listener()));
    expect(hook.result.current).toBe(false);
    hook.unmount();
    expect(removeEventListener).toHaveBeenCalledOnce();
    expect(listeners.size).toBe(0);
  });
});
