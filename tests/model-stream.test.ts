import { describe, expect, it, vi } from "vitest";
import { Doc } from "yjs";
import { getModelDoStream } from "../packages/realtime/src/documents/modelDoStream/getModelDoStream";
import { getModelDoGenerateReadableStream } from "../packages/realtime/src/documents/modelDoStream/getModelDoGenerateReadableStream";
import { pushModelDoStreamPart } from "../packages/realtime/src/documents/modelDoStream/pushModelDoStreamPart";
import { setModelDoStreamDone } from "../packages/realtime/src/documents/modelDoStream/setModelDoStreamDone";
import { setModelDoStreamError } from "../packages/realtime/src/documents/modelDoStream/setModelDoStreamError";
const part: any = { type: "text-delta", id: "text", delta: "Hello" };
describe("model stream lifecycle", () => {
  it("completes with only an unrelated optional callback", async () => {
    const doc = new Doc();
    const reader = getModelDoGenerateReadableStream(doc, {
      onStreamCancel: vi.fn(),
    }).getReader();
    pushModelDoStreamPart(doc, part);
    setModelDoStreamDone(doc, 1);
    expect(await reader.read()).toEqual({ value: part, done: false });
    expect((await reader.read()).done).toBe(true);
    doc.destroy();
  });
  it("propagates errors without requiring an error callback", async () => {
    const doc = new Doc();
    const reader = getModelDoGenerateReadableStream(doc, {
      onStreamDone: vi.fn(),
    }).getReader();
    const rejection = expect(reader.read()).rejects.toMatchObject({
      message: "failed",
    });
    expect(() => setModelDoStreamError(doc, new Error("failed"))).not.toThrow();
    await rejection;
    doc.destroy();
  });
  it("replays existing completed content immediately to late subscribers", async () => {
    const doc = new Doc();
    pushModelDoStreamPart(doc, part);
    setModelDoStreamDone(doc, 1);
    const onStreamDone = vi.fn();
    const reader = getModelDoGenerateReadableStream(doc, {
      onStreamDone,
    }).getReader();
    expect(await reader.read()).toEqual({ value: part, done: false });
    expect(await reader.read()).toEqual({ value: undefined, done: true });
    expect(onStreamDone).toHaveBeenCalledOnce();
    doc.destroy();
  });
  it("removes observers when a consumer cancels before completion", async () => {
    const doc = new Doc();
    const { parts, properties } = getModelDoStream(doc);
    const unobserveParts = vi.spyOn(parts, "unobserve");
    const unobserveProperties = vi.spyOn(doc.getMap("properties"), "unobserve");
    const onStreamDone = vi.fn();
    const reader = getModelDoGenerateReadableStream(doc, {
      onStreamDone,
    }).getReader();
    await reader.cancel();
    expect(unobserveParts).toHaveBeenCalledOnce();
    expect(unobserveProperties).toHaveBeenCalledOnce();
    pushModelDoStreamPart(doc, part);
    setModelDoStreamDone(doc, 1);
    expect(onStreamDone).not.toHaveBeenCalled();
    doc.destroy();
  });
  it("reports existing failures and can transport ordinary Error objects", async () => {
    const doc = new Doc();
    setModelDoStreamError(doc, new Error("model unavailable"));
    const onStreamError = vi.fn();
    const reader = getModelDoGenerateReadableStream(doc, {
      onStreamError,
    }).getReader();
    await expect(reader.read()).rejects.toMatchObject({
      name: "Error",
      message: "model unavailable",
    });
    expect(onStreamError).toHaveBeenCalledOnce();
    doc.destroy();
  });
  it("waits for all announced parts and closes once", async () => {
    const doc = new Doc();
    const onStreamDone = vi.fn();
    const reader = getModelDoGenerateReadableStream(doc, {
      onStreamDone,
    }).getReader();
    const { properties } = getModelDoStream(doc);
    properties.set("completeCount", 1);
    properties.set("done", true);
    pushModelDoStreamPart(doc, part);
    expect(await reader.read()).toEqual({ value: part, done: false });
    expect((await reader.read()).done).toBe(true);
    expect(onStreamDone).toHaveBeenCalledOnce();
    properties.set("done", true);
    expect(onStreamDone).toHaveBeenCalledOnce();
    doc.destroy();
  });
});
