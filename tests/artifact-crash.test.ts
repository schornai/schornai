import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, it, vi } from "vitest";

it("resumes bytes left by SIGKILL in a new process over real HTTP", async () => {
  const root = await mkdtemp(join(tmpdir(), "artifact-crash-"));
  const bytes = Buffer.alloc(128 * 1024, 42);
  const id = createHash("sha256").update(bytes).digest("hex");
  const ranges: (string | undefined)[] = [];
  const server = createServer((request, response) => {
    ranges.push(request.headers.range);
    const offset = Number(
      /^bytes=(\d+)-$/.exec(request.headers.range ?? "")?.[1] ?? 0,
    );
    if (!offset) {
      response.writeHead(200, { "Content-Length": bytes.length });
      response.write(bytes.subarray(0, 65536));
      // The client is killed before this incomplete transfer can finish.
    } else {
      response.writeHead(206, {
        "Content-Length": bytes.length - offset,
        "Content-Range": `bytes ${offset}-${bytes.length - 1}/${bytes.length}`,
      });
      response.end(bytes.subarray(offset));
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening").catch(async (error) => {
    await rm(root, { recursive: true, force: true });
    throw error;
  });
  const address = server.address() as { port: number };
  const moduleUrl = pathToFileURL(
    resolve("packages/service/src/artifactDownload.ts"),
  ).href;
  const script = `
    import { artifactLimits, cleanArtifactCache, downloadArtifact } from ${JSON.stringify(moduleUrl)};
    const limits = { ...artifactLimits({}), minFreeBytes: 0 };
    const cache = await cleanArtifactCache(${JSON.stringify(root)}, limits);
    await downloadArtifact(${JSON.stringify({ id, size: bytes.length })}, ${JSON.stringify(`http://127.0.0.1:${address.port}/artifact`)}, {}, cache, limits, new AbortController().signal);
  `;
  const children: ReturnType<typeof spawn>[] = [];
  const launch = () => {
    const child = spawn(
      process.execPath,
      ["--input-type=module", "-e", script],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    children.push(child);
    return child;
  };
  try {
    const first = launch();
    const exited = once(first, "exit");
    const file = join(root, "cache/artifacts", `${id}.part`);
    await vi.waitFor(async () => expect((await stat(file)).size).toBe(65536), {
      timeout: 5000,
    });
    first.kill("SIGKILL");
    expect((await exited)[1]).toBe("SIGKILL");
    const second = launch();
    let errors = "";
    second.stderr!.on("data", (chunk) => {
      errors += chunk;
    });
    const [code] = await once(second, "exit");
    expect(code, errors).toBe(0);
    expect(await readFile(file)).toEqual(bytes);
    expect(ranges).toEqual([undefined, "bytes=65536-"]);
  } finally {
    for (const child of children)
      if (child.exitCode === null && child.signalCode === null)
        child.kill("SIGKILL");
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
});
