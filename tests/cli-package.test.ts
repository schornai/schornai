import { beforeEach, expect, it, vi } from "vitest";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const files = vi.hoisted(() => ({ cp: vi.fn(), rm: vi.fn() }));
vi.mock("node:fs/promises", () => files);
beforeEach(() => {
  vi.resetModules();
  files.cp.mockReset().mockResolvedValue(undefined);
  files.rm.mockReset().mockResolvedValue(undefined);
});
it("packages the compiled service and license after clearing only the CLI's output directory", async () => {
  await import("../apps/cli/scripts/build.mjs");
  expect(files.rm).toHaveBeenCalledWith(
    expect.objectContaining({
      pathname: expect.stringMatching(/\/apps\/cli\/dist$/),
    }),
    { recursive: true, force: true },
  );
  expect(
    files.cp.mock.calls.map(([source, target]) => [
      relative(root, fileURLToPath(source)),
      relative(root, fileURLToPath(target)),
    ]),
  ).toEqual([
    ["packages/service/dist", "apps/cli/dist/service"],
    ["LICENSE", "apps/cli/LICENSE"],
  ]);
});
it("fails packaging when the compiled runtime is absent", async () => {
  files.cp.mockRejectedValueOnce(new Error("runtime missing"));
  await expect(import("../apps/cli/scripts/build.mjs")).rejects.toThrow(
    "runtime missing",
  );
  expect(files.cp).toHaveBeenCalledOnce();
});
