import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mapTranscription } from "../apps/transcriber-mac/src/service/mapTranscription";
import { TranscriberProcess } from "../apps/transcriber-mac/src/service/runTranscriber";
import { spawn } from "node:child_process";

vi.mock("node:child_process", () => ({ spawn: vi.fn() }));
const result = {
  segments: [
    {
      start: 0,
      end: 1.5,
      no_speech_prob: 0.03,
      words: [{ word: "Héllo", start: 0, end: 0.7, probability: 0.99 }],
    },
  ],
} as any;
function child() {
  const requests: any[] = [];
  const process = Object.assign(new EventEmitter(), {
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    stdin: new PassThrough(),
    kill: vi.fn(() => {
      queueMicrotask(() => process.emit("close", null, "SIGKILL"));
      return true;
    }),
  });
  process.stdin.on("data", (data) => requests.push(JSON.parse(String(data))));
  vi.mocked(spawn).mockReturnValueOnce(process as any);
  return { process, requests };
}
const params = () => ({
  file: new Blob(["audio"]),
  modelIdentifier: "whisper",
});
async function request(requests: any[], index = 0) {
  await vi.waitFor(() => expect(requests.length).toBeGreaterThan(index));
  return requests[index];
}
function respond(process: ReturnType<typeof child>["process"], id: string) {
  process.stdout.write(JSON.stringify({ id, result }) + "\n");
}

describe("persistent transcription process", () => {
  beforeEach(() => vi.mocked(spawn).mockReset());
  it("maps timings and initial review status", () => {
    expect(mapTranscription(result).segments[0]).toMatchObject({
      timeStart: 0,
      timeEnd: 1.5,
      noSpeechProbability: 0.03,
      reviewed: false,
      words: [{ word: "Héllo", timeStart: 0, timeEnd: 0.7, probability: 0.99 }],
    });
    expect(result.segments[0]).not.toHaveProperty("reviewed");
  });
  it("reuses the process across jobs, keeps options separate and cleans temporary audio", async () => {
    const { process, requests } = child();
    await using worker = new TranscriberProcess();
    const first = worker.transcribe({
      ...params(),
      modelPrompt: "Vocabulary",
      retryLevel: "balanced",
    });
    const a = await request(requests);
    expect(await readFile(a.audioPath, "utf8")).toBe("audio");
    expect(a).toMatchObject({
      modelIdentifier: "whisper",
      modelPrompt: "Vocabulary",
      retryLevel: "balanced",
    });
    const bytes = Buffer.from(JSON.stringify({ id: a.id, result }) + "\n");
    const split = bytes.indexOf(Buffer.from("é")) + 1;
    process.stderr.write("diagnostics are not protocol data\n");
    process.stdout.write(bytes.subarray(0, split));
    process.stdout.write(bytes.subarray(split));
    await expect(first).resolves.toEqual(mapTranscription(result));
    expect(existsSync(a.audioPath)).toBe(false);
    const second = worker.transcribe({ ...params(), modelIdentifier: "other" });
    const b = await request(requests, 1);
    expect(b).toMatchObject({
      modelIdentifier: "other",
      retryLevel: "thorough",
    });
    expect(b).not.toHaveProperty("modelPrompt");
    respond(process, b.id);
    await second;
    expect(spawn).toHaveBeenCalledOnce();
    expect(process.kill).not.toHaveBeenCalled();
    expect(vi.mocked(spawn).mock.calls[0]?.[2]?.env).not.toHaveProperty(
      "SUPABASE_SERVICE_ROLE_KEY",
    );
  });
  it("aborts active inference, cleans audio and starts a fresh process for the next job", async () => {
    const first = child(),
      second = child();
    await using worker = new TranscriberProcess();
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    const running = worker.transcribe({
      ...params(),
      abortSignal: controller.signal,
    });
    const rejected = expect(running).rejects.toThrow("cancelled");
    const a = await request(first.requests);
    controller.abort(new Error("cancelled"));
    await rejected;
    expect(first.process.kill).toHaveBeenCalledWith("SIGKILL");
    expect(existsSync(a.audioPath)).toBe(false);
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    const next = worker.transcribe(params());
    respond(second.process, (await request(second.requests)).id);
    await expect(next).resolves.toEqual(mapTranscription(result));
    expect(spawn).toHaveBeenCalledTimes(2);
  });
  it.each(["malformed", "wrong-id", "exit", "startup", "stdin"])(
    "recovers after %s failures",
    async (failure) => {
      const first = child(),
        second = child();
      await using worker = new TranscriberProcess();
      const running = worker.transcribe(params());
      const rejected = expect(running).rejects.toThrow();
      const a = await request(first.requests);
      if (failure === "malformed") first.process.stdout.write("{bad}\n");
      if (failure === "wrong-id") respond(first.process, "stale-job");
      if (failure === "exit") first.process.emit("close", 1);
      if (failure === "startup")
        first.process.emit("error", new Error("ENOENT"));
      if (failure === "stdin")
        first.process.stdin.emit("error", new Error("EPIPE"));
      await rejected;
      expect(existsSync(a.audioPath)).toBe(false);
      const next = worker.transcribe(params());
      respond(second.process, (await request(second.requests)).id);
      await next;
    },
  );
  it("keeps the worker usable after a reported audio error", async () => {
    const { process, requests } = child();
    await using worker = new TranscriberProcess();
    const running = worker.transcribe(params());
    const rejected = expect(running).rejects.toThrow("Invalid audio");
    const a = await request(requests);
    process.stdout.write(
      JSON.stringify({ id: a.id, error: "Invalid audio" }) + "\n",
    );
    await rejected;
    const next = worker.transcribe(params());
    respond(process, (await request(requests, 1)).id);
    await next;
    expect(spawn).toHaveBeenCalledOnce();
  });
  it("rejects pre-aborted and concurrent requests without disturbing the active job", async () => {
    const { process, requests } = child();
    await using worker = new TranscriberProcess();
    await expect(
      worker.transcribe({ ...params(), abortSignal: AbortSignal.abort() }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(spawn).not.toHaveBeenCalled();
    const running = worker.transcribe(params());
    const a = await request(requests);
    await expect(worker.transcribe(params())).rejects.toThrow(
      "already processing",
    );
    respond(process, a.id);
    await running;
  });
  it("stops the idle process when its queue worker shuts down", async () => {
    const { process, requests } = child();
    const worker = new TranscriberProcess();
    const running = worker.transcribe(params());
    respond(process, (await request(requests)).id);
    await running;
    await worker[Symbol.asyncDispose]();
    expect(process.kill).toHaveBeenCalledOnce();
    await expect(worker.transcribe(params())).rejects.toThrow("stopped");
  });
});
