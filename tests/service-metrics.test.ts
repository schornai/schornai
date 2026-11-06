import { beforeEach, expect, it, vi } from "vitest";
import { cpus, freemem, totalmem, uptime } from "node:os";
import { readdir, readFile, statfs } from "node:fs/promises";
import { execFile } from "node:child_process";
import {
  createMetricsSampler,
  gpuMetrics,
  parseAppleGpu,
} from "../packages/service/src/metrics.ts";

vi.mock("node:os", () => ({
  cpus: vi.fn(),
  freemem: vi.fn(),
  totalmem: vi.fn(),
  uptime: vi.fn(),
}));
vi.mock("node:fs/promises", () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
  statfs: vi.fn(),
}));
vi.mock("node:child_process", () => {
  const execFile = vi.fn();
  // Node's execFile promisifier returns both streams, unlike a generic callback.
  Object.defineProperty(execFile, Symbol.for("nodejs.util.promisify.custom"), {
    value: (...args: unknown[]) =>
      new Promise((resolve, reject) => {
        execFile(
          ...args,
          (error: Error | null, stdout: string, stderr: string) =>
            error ? reject(error) : resolve({ stdout, stderr }),
        );
      }),
  });
  return { execFile };
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(process, "platform", "get").mockReturnValue("linux");
  vi.mocked(execFile).mockImplementation((...args: any[]) => {
    args.at(-1)(null, "GPU, 42\n", "");
    return {} as any;
  });
  vi.mocked(cpus).mockReturnValue([
    { times: { user: 10, nice: 0, sys: 0, idle: 90, irq: 0 } },
  ] as any);
  vi.mocked(totalmem).mockReturnValue(1000);
  vi.mocked(freemem).mockReturnValue(250);
  vi.mocked(uptime).mockReturnValue(80);
  vi.mocked(statfs).mockResolvedValue({
    blocks: 100,
    bsize: 20,
    bfree: 30,
  } as any);
});

it("samples CPU deltas and host memory/disk without inventing an initial percentage", async () => {
  const sample = createMetricsSampler("/service");
  expect(await sample()).toEqual({
    cpuPercent: null,
    memory: { total: 1000, used: 750 },
    disk: { total: 2000, used: 1400 },
    gpus: [{ name: "GPU", utilizationPercent: 42 }],
    uptimeSeconds: 80,
  });
  vi.mocked(cpus).mockReturnValue([
    { times: { user: 40, nice: 0, sys: 0, idle: 160, irq: 0 } },
  ] as any);
  expect((await sample()).cpuPercent).toBeCloseTo(30);
  expect(statfs).toHaveBeenCalledWith("/service");
});

it("keeps unavailable disk and uptime explicit and bounds anomalous memory counters", async () => {
  vi.mocked(statfs).mockRejectedValue(new Error("not permitted"));
  vi.mocked(uptime).mockImplementation(() => {
    throw new Error("restricted host");
  });
  vi.mocked(freemem).mockReturnValue(2000);
  expect(await createMetricsSampler("/restricted")()).toMatchObject({
    disk: null,
    uptimeSeconds: null,
    memory: { total: 1000, used: 0 },
  });
});

it("parses multiple NVIDIA devices, bounds percentages and preserves missing readings", async () => {
  vi.mocked(execFile).mockImplementation((...args: any[]) => {
    args.at(-1)(
      null,
      "GPU A, 150\nGPU B, -5\nGPU C, N/A\nGPU D, \nGPU E\n\n",
      "",
    );
    return {} as any;
  });
  expect(await gpuMetrics()).toEqual([
    { name: "GPU A", utilizationPercent: 100 },
    { name: "GPU B", utilizationPercent: 0 },
    { name: "GPU C", utilizationPercent: null },
    { name: "GPU D", utilizationPercent: null },
    { name: "GPU E", utilizationPercent: null },
  ]);
  expect(execFile).toHaveBeenCalledWith(
    "nvidia-smi",
    expect.any(Array),
    { timeout: 3000 },
    expect.any(Function),
  );
});

it("falls back to readable DRM devices when NVIDIA tooling is unavailable", async () => {
  vi.mocked(execFile).mockImplementation((...args: any[]) => {
    args.at(-1)(new Error("not installed"));
    return {} as any;
  });
  vi.mocked(readdir).mockResolvedValue([
    "card0",
    "card0-DP-1",
    "card1",
    "card2",
  ] as any);
  vi.mocked(readFile).mockImplementation(async (file) => {
    if (String(file).includes("card0/")) return "23\n";
    if (String(file).includes("card1/")) return "invalid";
    throw new Error("not supported");
  });
  expect(await gpuMetrics()).toEqual([
    { name: "card0", utilizationPercent: 23 },
    { name: "card1", utilizationPercent: null },
  ]);
  expect(readFile).toHaveBeenCalledTimes(3);
  vi.mocked(readdir).mockRejectedValue(new Error("no DRM"));
  expect(await gpuMetrics()).toEqual([]);
});

it("samples Apple GPUs and tolerates restricted counters", async () => {
  vi.spyOn(process, "platform", "get").mockReturnValue("darwin");
  const counters = '"Device Utilization %" = 12, "Device Utilization %" = 200';
  vi.mocked(execFile).mockImplementation((...args: any[]) => {
    args.at(-1)(null, counters, "");
    return {} as any;
  });
  expect(await gpuMetrics()).toEqual([
    { name: "Apple GPU", utilizationPercent: 12 },
    { name: "Apple GPU 2", utilizationPercent: 100 },
  ]);
  expect(execFile).toHaveBeenCalledWith(
    "/usr/sbin/ioreg",
    expect.any(Array),
    expect.objectContaining({ timeout: 3000 }),
    expect.any(Function),
  );
  vi.mocked(execFile).mockImplementation((...args: any[]) => {
    args.at(-1)(new Error("denied"));
    return {} as any;
  });
  expect(await gpuMetrics()).toEqual([]);
  expect(parseAppleGpu("no counters")).toEqual([]);
});

it("returns no GPU counters on unsupported hosts", async () => {
  vi.spyOn(process, "platform", "get").mockReturnValue("win32");
  expect(await gpuMetrics()).toEqual([]);
  expect(execFile).not.toHaveBeenCalled();
});
