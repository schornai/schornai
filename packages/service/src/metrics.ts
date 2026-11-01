import { cpus, freemem, totalmem, uptime } from "node:os";
import { statfs, readdir, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { MachineReport } from "@schornio/aibox-realtime/documents/services/_schema";
const exec = promisify(execFile);
const percent = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null;
const cpuTimes = () =>
  cpus().reduce(
    (sum, cpu) => ({
      idle: sum.idle + cpu.times.idle,
      total: sum.total + Object.values(cpu.times).reduce((a, b) => a + b, 0),
    }),
    { idle: 0, total: 0 },
  );

export function parseAppleGpu(
  output: string,
): MachineReport["metrics"]["gpus"] {
  return [...output.matchAll(/"Device Utilization %"\s*=\s*(\d+)/g)].map(
    (match, index) => ({
      name: index ? `Apple GPU ${index + 1}` : "Apple GPU",
      utilizationPercent: percent(Number(match[1])),
    }),
  );
}
export async function gpuMetrics(): Promise<MachineReport["metrics"]["gpus"]> {
  if (process.platform === "darwin") {
    try {
      return parseAppleGpu(
        (
          await exec(
            "/usr/sbin/ioreg",
            ["-r", "-d", "1", "-c", "AGXAccelerator"],
            { timeout: 3000, maxBuffer: 1024 * 1024 },
          )
        ).stdout,
      );
    } catch {
      return [];
    }
  }
  if (process.platform === "linux") {
    try {
      const { stdout } = await exec(
        "nvidia-smi",
        ["--query-gpu=name,utilization.gpu", "--format=csv,noheader,nounits"],
        { timeout: 3000 },
      );
      return stdout
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [name, value] = line.split(",");
          return {
            name: name!.trim(),
            utilizationPercent: value?.trim()
              ? percent(Number(value.trim()))
              : null,
          };
        });
    } catch {
      const devices = await readdir("/sys/class/drm").catch(
        () => [] as string[],
      );
      const values = await Promise.all(
        devices
          .filter((name) => /^card\d+$/.test(name))
          .map(async (name) => {
            const value = await readFile(
              `/sys/class/drm/${name}/device/gpu_busy_percent`,
              "utf8",
            ).catch(() => undefined);
            return value === undefined
              ? undefined
              : { name, utilizationPercent: percent(Number(value.trim())) };
          }),
      );
      return values.filter((value) => value !== undefined);
    }
  }
  return [];
}
export function createMetricsSampler(root: string) {
  let previous = cpuTimes();
  return async (): Promise<MachineReport["metrics"]> => {
    const current = cpuTimes();
    const elapsed = current.total - previous.total;
    const cpuPercent =
      elapsed > 0
        ? percent(100 * (1 - (current.idle - previous.idle) / elapsed))
        : null;
    previous = current;
    const [disk, gpus] = await Promise.all([
      statfs(root)
        .then((stat) => ({
          total: stat.blocks * stat.bsize,
          used: (stat.blocks - stat.bfree) * stat.bsize,
        }))
        .catch(() => null),
      gpuMetrics(),
    ]);
    const total = totalmem();
    let uptimeSeconds: number | null = null;
    try {
      uptimeSeconds = uptime();
    } catch {
      /* Restricted hosts can deny host uptime. */
    }
    return {
      cpuPercent,
      memory: { total, used: Math.max(0, total - freemem()) },
      disk,
      gpus,
      uptimeSeconds,
    };
  };
}
