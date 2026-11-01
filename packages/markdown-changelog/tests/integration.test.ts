import { readFile as readFileCore } from "node:fs/promises";
import { updateMDC } from "../src/update.ts";
import { getDirname } from "./_helper.ts";
import { vi as jest } from "vitest";

const assetPath = `${getDirname(import.meta.url)}/assets/integration`;

async function readFile(fileName: string) {
  return await readFileCore(`${assetPath}/${fileName}`, { encoding: "utf-8" });
}

describe("integration", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("full roundtrip: updateMDC", async () => {
    const v1MDCString = await readFile("v1.md");
    const v2MDCString = await readFile("v2.md");
    const v3MDCString = await readFile("v3.md");

    // Changelog of new MDC gets ignored
    const v1Tov2 = updateMDC(v1MDCString, v2MDCString);

    expect(v1Tov2).toEqual(v2MDCString);

    jest.setSystemTime(new Date("2026-01-01T00:01:00.000Z"));
    const v2Tov3 = updateMDC(v1Tov2, v3MDCString);

    expect(v2Tov3).toEqual(v3MDCString);
  });
});
