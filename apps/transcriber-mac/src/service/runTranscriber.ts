import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { StorageTranscription } from "@schornio/aibox-database/storage/_types";
import type { TranscriptionRetryLevel } from "@schornio/aibox-database/transcriber/_types";
import type { TranscriptionResult } from "./TranscriptionResult.ts";
import { mapTranscription } from "./mapTranscription.ts";

/** One sequential Python process per queue worker; MLX retains its last model.
 * Only audio/model options cross this boundary, never Supabase credentials or claims.
 */
export class TranscriberProcess {
  #child?: ChildProcessWithoutNullStreams;
  #closing: Promise<void> = Promise.resolve();
  #busy = false;
  #disposed = false;
  #pending?: {
    id: string;
    resolve: (result: StorageTranscription) => void;
    reject: (reason: unknown) => void;
  };

  #stop(reason: unknown) {
    const child = this.#child;
    this.#child = undefined;
    this.#pending?.reject(reason);
    this.#pending = undefined;
    if (child) {
      this.#closing = new Promise<void>((resolve) =>
        child.once("close", resolve),
      );
      child.kill("SIGKILL");
    }
  }

  #process() {
    if (this.#child) return this.#child;
    const child = spawn(
      join(process.cwd(), "dist/transcribe-worker/transcribe-worker"),
      ["--serve"],
      // Python needs model locations and runtime paths, not worker credentials.
      {
        env: Object.fromEntries(
          Object.entries(process.env).filter(([key]) =>
            [
              "PATH",
              "HOME",
              "TMPDIR",
              "SCHORNAI_HOME",
              "LANG",
              "LC_ALL",
            ].includes(key),
          ),
        ),
      },
    );
    this.#child = child;
    let output = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (data: string) => {
      if (this.#child !== child) return;
      output += data;
      let newline: number;
      while ((newline = output.indexOf("\n")) !== -1) {
        const line = output.slice(0, newline);
        output = output.slice(newline + 1);
        try {
          const response = JSON.parse(line) as {
            id: string;
            result?: TranscriptionResult;
            error?: string;
          };
          const pending = this.#pending;
          if (!pending || response.id !== pending.id) throw new Error();
          if (response.error) {
            pending.reject(new Error(response.error));
          } else if (response.result) {
            pending.resolve(mapTranscription(response.result));
          } else {
            throw new Error();
          }
          this.#pending = undefined;
        } catch {
          this.#stop(new Error("Transcriber returned an invalid response"));
          return;
        }
      }
      if (output.length > 64 * 1024 * 1024)
        this.#stop(new Error("Transcriber response exceeded the size limit"));
    });
    // Diagnostics never share the result buffer or leak audio text into service logs.
    child.stderr.resume();
    child.stdin.on("error", () => {
      if (this.#child === child)
        this.#stop(new Error("Cannot send audio to the transcriber process"));
    });
    child.once("error", () => {
      if (this.#child === child)
        this.#stop(
          new Error(
            "Cannot start the transcriber process; rebuild or reinstall the macOS worker",
          ),
        );
    });
    child.once("close", () => {
      if (this.#child !== child) return;
      this.#child = undefined;
      this.#pending?.reject(
        new Error("Transcriber process closed before returning a result"),
      );
      this.#pending = undefined;
    });
    return child;
  }

  async transcribe({
    abortSignal,
    file,
    modelIdentifier,
    modelPrompt,
    retryLevel = "thorough",
  }: {
    abortSignal?: AbortSignal;
    file: Blob;
    modelIdentifier: string;
    modelPrompt?: string;
    retryLevel?: TranscriptionRetryLevel;
  }): Promise<StorageTranscription> {
    abortSignal?.throwIfAborted();
    if (this.#disposed) throw new Error("Transcriber has been stopped");
    if (this.#busy) throw new Error("Transcriber is already processing a file");
    this.#busy = true;
    let directory: string | undefined;
    const abort = () => this.#stop(abortSignal?.reason);
    try {
      await this.#closing;
      directory = await mkdtemp(join(tmpdir(), "aibox-transcribe-"));
      const audioPath = join(directory, "audio");
      await pipeline(
        Readable.fromWeb(file.stream()),
        createWriteStream(audioPath, { mode: 0o600 }),
        { signal: abortSignal },
      );
      abortSignal?.throwIfAborted();
      if (this.#disposed) throw new Error("Transcriber has been stopped");
      const child = this.#process();
      const id = crypto.randomUUID();
      const result = new Promise<StorageTranscription>((resolve, reject) => {
        this.#pending = { id, resolve, reject };
      });
      abortSignal?.addEventListener("abort", abort, { once: true });
      child.stdin.write(
        JSON.stringify({
          id,
          audioPath,
          modelIdentifier,
          modelPrompt,
          retryLevel,
        }) + "\n",
      );
      return await result;
    } finally {
      abortSignal?.removeEventListener("abort", abort);
      await this.#closing;
      if (directory) await rm(directory, { recursive: true, force: true });
      this.#busy = false;
    }
  }

  async [Symbol.asyncDispose]() {
    this.#disposed = true;
    this.#stop(new Error("Transcriber worker stopped"));
    await this.#closing;
  }
}
