import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import {
  launch,
  completion,
  terminate,
} from "../packages/service/src/process.ts";

it("keeps the service's Node watch IPC protocol out of managed processes", async () => {
  const root = await mkdtemp(join(tmpdir(), "service-watch-env-"));
  const file = join(root, "environment.json");
  const env = { ...process.env, WATCH_REPORT_DEPENDENCIES: "1" };
  const child = launch(
    {
      name: "worker",
      command: process.execPath,
      args: [
        "-e",
        `require('node:fs').writeFileSync(process.argv[1],JSON.stringify({watch:process.env.WATCH_REPORT_DEPENDENCIES??null}));`,
        file,
      ],
      env,
    },
    () => {},
  );
  try {
    await completion(child);
    expect(JSON.parse(await readFile(file, "utf8"))).toEqual({ watch: null });
    expect(env.WATCH_REPORT_DEPENDENCIES).toBe("1");
  } finally {
    await terminate(child, 100);
    await rm(root, { recursive: true, force: true });
  }
});

it.each(["ignore", "inherit"] as const)(
  "terminates surviving descendants with %s pipes after their worker has exited",
  async (stdio) => {
    const root = await mkdtemp(join(tmpdir(), "service-process-"));
    const ready = join(root, "ready");
    const descendant = `require('node:fs').writeFileSync(process.argv[1],String(process.pid)); process.on('SIGTERM',()=>{}); setInterval(()=>{},1000);`;
    const child = launch(
      {
        name: "worker",
        command: process.execPath,
        args: [
          "-e",
          `const child=require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(descendant)},process.argv[1]],{stdio:${JSON.stringify(stdio)}}); child.unref();`,
          ready,
        ],
        env: process.env,
      },
      () => {},
    );
    let pid: number | undefined;
    try {
      await completion(child, "exit");
      await expect
        .poll(async () => {
          try {
            pid = Number(await readFile(ready, "utf8"));
            return pid > 0;
          } catch {
            return false;
          }
        })
        .toBe(true);
      process.kill(pid!, 0);
      await terminate(child, 100);
      await expect
        .poll(() => {
          try {
            process.kill(pid!, 0);
            return false;
          } catch (error) {
            return (error as NodeJS.ErrnoException).code === "ESRCH";
          }
        })
        .toBe(true);
    } finally {
      if (pid)
        try {
          process.kill(pid, "SIGKILL");
        } catch {}
      await terminate(child, 100);
      await rm(root, { recursive: true, force: true });
    }
  },
);
