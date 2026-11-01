import { expect, it } from "vitest";
import { currentSetupIds, latestSetupFor } from "../packages/xrag/src/setup.ts";
import type { Artifact } from "../packages/xrag/src/schema.ts";
import { needsArtifact } from "../packages/service/src/artifacts.ts";

const release = (
  id: string,
  day: number,
  platform?: string,
  arch?: string,
): Artifact => ({
  id: id.repeat(64),
  name: `${id}.tar`,
  size: 1,
  createdAt: `2026-10-${day}T00:00:00Z`,
  xrag: {
    xrag_type: "setup",
    xrag_version: 1,
    ...(platform ? { platform } : {}),
    ...(arch ? { arch } : {}),
  },
});

it("chooses the latest compatible setup separately for Mac and Linux, including legacy bundles", () => {
  const legacy = release("a", 20);
  const mac = release("b", 21, "darwin", "arm64");
  const linux = release("c", 22, "linux", "x64");
  const all = [linux, legacy, mac];
  expect(latestSetupFor(all, "darwin", "arm64")).toEqual(mac);
  expect(latestSetupFor(all, "linux", "x64")).toEqual(linux);
  expect(latestSetupFor(all, "linux", "arm64")).toEqual(legacy);
  expect(currentSetupIds(all)).toEqual(new Set([legacy.id, mac.id, linux.id]));
  expect(
    needsArtifact(
      release(
        "d",
        23,
        process.platform === "darwin" ? "linux" : "darwin",
        process.arch,
      ),
      ["core"],
    ),
  ).toBe(false);
});

it("retains the withdrawn latest release for each target instead of reinstalling an older one", () => {
  const old = release("a", 20, "linux", "x64");
  const withdrawn = {
    ...release("b", 21, "linux", "x64"),
    deletedAt: "2026-10-22T00:00:00Z",
  };
  const mac = release("c", 23, "darwin", "arm64");
  expect(latestSetupFor([old, withdrawn, mac], "linux", "x64")).toEqual(
    withdrawn,
  );
  expect(currentSetupIds([old, withdrawn, mac])).not.toContain(old.id);
});
