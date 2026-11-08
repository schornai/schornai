import { afterEach, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => ({ spawnSync: vi.fn() }));
vi.mock("node:fs", () => ({ default: { existsSync: () => true } }));
import { spawnSync } from "node:child_process";

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
  vi.resetModules();
});

it.each([
  { statuses: [0, 0, 0, 0], expected: 0 },
  { statuses: [1, 0, 0, 0], expected: 1 },
  { statuses: [0, 1, 0, 0], expected: 1 },
  { statuses: [0, 0, 1, 0], expected: 1 },
  { statuses: [0, 0, 0, 1], expected: 1 },
])(
  "enforces coverage without a flag and propagates $statuses",
  async ({ statuses, expected }) => {
    vi.spyOn(process, "argv", "get").mockReturnValue([
      "node",
      "scripts/test-all.mjs",
    ]);
    const exit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    for (const status of statuses)
      vi.mocked(spawnSync).mockReturnValueOnce({ status } as any);
    await import("../scripts/test-all.mjs");
    const commands = vi.mocked(spawnSync).mock.calls.map((call) => call[1]);
    expect(commands).toEqual([
      ["scripts/check-translations.mjs"],
      ["node_modules/vitest/vitest.mjs", "run", "--coverage"],
      ["scripts/test-python.mjs", "--coverage"],
      ["scripts/test-report.mjs"],
    ]);
    expect(exit).toHaveBeenCalledWith(expected);
  },
);

it.each(["--coverage=false", "tests/chat-support-calculator.test.ts"])(
  "rejects full-suite bypass %s",
  async (argument) => {
    vi.spyOn(process, "argv", "get").mockReturnValue([
      "node",
      "scripts/test-all.mjs",
      argument,
    ]);
    await expect(import("../scripts/test-all.mjs")).rejects.toThrow(
      "does not accept filters or overrides",
    );
    expect(spawnSync).not.toHaveBeenCalled();
  },
);
