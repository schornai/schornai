import { describe, expect, it, vi } from "vitest";
import { blobToDataURL } from "../packages/utils/src/blobToDataURL";
import { composite } from "../packages/utils/src/composite";
import { ExhaustiveError } from "../packages/utils/src/ExhaustiveError";
import { formatFileSize } from "../packages/utils/src/formatFileSize";
import { getEnvSafe } from "../packages/utils/src/getEnvSafe";
import {
  getFileCategory,
  fileNeedsProcessing,
} from "../packages/utils/src/getFileTypeLabel";
import { getLocalized } from "../packages/utils/src/getLocalized";
import { groupByDays, getTimeGroups } from "../packages/utils/src/groupByDays";
import { omitNullish } from "../packages/utils/src/omitNullish";
import { pickRandom } from "../packages/utils/src/pickRandom";
import { resolvePath } from "../packages/utils/src/resolvePath";
import { tryAsync } from "../packages/utils/src/tryAsync";
import { trySync } from "../packages/utils/src/trySync";

describe("file utilities", () => {
  it.each([
    [0, "0 Byte"],
    [999, "999 Byte"],
    [1000, "1 kB"],
    [1001, "2 kB"],
    [999999, "1000 kB"],
    [1000000, "1 MB"],
    [1000001, "2 MB"],
    [1000000000, "1 GB"],
    [1000000001, "2 GB"],
  ])("formats %s as %s", (size, label) =>
    expect(formatFileSize(size as number)).toBe(label),
  );
  it.each([
    ["a.md", "plain-text", undefined],
    ["a.png", "image", "text"],
    ["a.pdf", "rich-text", "text"],
    ["a.xlsx", "spreadsheet", "text"],
    ["a.pptx", "presentation", "text"],
    ["a.ts", "code", undefined],
    ["a.mp3", "audio", "transcript"],
    ["a.mp4", "video", "transcript"],
    ["a.xyz", "unknown", undefined],
    ["", "unknown", undefined],
  ])("classifies %s", (path, category, processing) => {
    expect(getFileCategory(path!)).toBe(category);
    expect(fileNeedsProcessing(path!)).toBe(processing);
  });
  it("encodes binary blobs without changing their MIME type", async () => {
    expect(
      await blobToDataURL(new Blob(["hello"], { type: "text/plain" })),
    ).toBe("data:text/plain;base64,aGVsbG8=");
    expect(await blobToDataURL(new Blob([]))).toBe("data:;base64,");
  });
  it("normalizes paths, prevents traversal beyond the root and sanitizes S3 names", () => {
    expect(resolvePath()).toBe("");
    for (const path of [
      "safe/．．/secret",
      "safe／．．／secret",
      "safe/.?./secret",
    ]) {
      expect(resolvePath(path)).toBe("secret");
      expect(resolvePath(resolvePath(path))).toBe(resolvePath(path));
    }
    expect(resolvePath("/../../one/./two/../three//")).toBe("one/three");
    expect(resolvePath('ä/weiß–?%*:|"<>\\')).toBe("a/weiss-");
    expect(resolvePath("ä/weiß?", { s3Compatible: false })).toBe("ä/weiß?");
    expect(resolvePath("/", { s3Compatible: true })).toBe("");
  });
});

describe("small control flow utilities", () => {
  it("reads required environment variables and reports their name on failure", () => {
    vi.stubEnv("TEST_REQUIRED", "value");
    expect(getEnvSafe("TEST_REQUIRED")).toBe("value");
    vi.stubEnv("TEST_REQUIRED", "");
    expect(() => getEnvSafe("TEST_REQUIRED")).toThrow(
      'Missing environment variable: "TEST_REQUIRED"',
    );
    expect(() => getEnvSafe("DOES_NOT_EXIST_IN_TEST")).toThrow();
  });
  it("keeps false, zero and empty strings while filtering nullish values", () => {
    expect([0, false, "", null, undefined, "x"].filter(omitNullish)).toEqual([
      0,
      false,
      "",
      "x",
    ]);
  });
  it("returns discriminated success or the original thrown value", async () => {
    const error = new Error("failure");
    expect(trySync(() => 0)).toEqual({ data: 0, error: undefined });
    expect(
      trySync(() => {
        throw error;
      }),
    ).toEqual({ data: undefined, error });
    expect(await tryAsync(async () => false)).toEqual({
      data: false,
      error: undefined,
    });
    expect(
      await tryAsync(async () => {
        throw error;
      }),
    ).toEqual({ data: undefined, error });
  });
  it("uses random selection with a fallback for absent or empty inputs", () => {
    expect(pickRandom(undefined, "fallback")).toBe("fallback");
    expect(pickRandom([], "fallback")).toBe("fallback");
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(pickRandom(["first", "last"], "fallback")).toBe("first");
    vi.mocked(Math.random).mockReturnValue(0.999);
    expect(pickRandom(["first", "last"], "fallback")).toBe("last");
  });
  it("resolves the requested language followed by the configured fallback order", () => {
    expect(getLocalized(undefined, "de", ["en"])).toBeUndefined();
    expect(getLocalized({ de: "Hallo", en: "Hello" }, "de", ["en"])).toBe(
      "Hallo",
    );
    expect(getLocalized({ en: "Hello" }, "fr", ["de", "en"])).toBe("Hello");
    expect(getLocalized({}, "fr", ["de"])).toBeUndefined();
  });
  it("includes unexpected values in exhaustive errors", () => {
    expect(new ExhaustiveError("unexpected" as never)).toBeInstanceOf(Error);
    expect(new ExhaustiveError("unexpected" as never).message).toContain(
      "unexpected",
    );
  });
  it("produces deterministic keys independent of object property ordering", () => {
    expect(composite(undefined)).toBe("undefined");
    expect(composite(null)).toBe("null");
    expect(composite("a")).toBe("string-a");
    expect(composite(2)).toBe("number-2");
    expect(composite(false)).toBe("boolean-false");
    const object = { a: 1, b: { c: "value" }, ignored: undefined };
    expect(composite(object)).toBe(composite({ b: { c: "value" }, a: 1 }));
    expect(composite(object)).toBe(composite(object));
    expect(composite([1, 2])).not.toBe(composite([2, 1]));
    expect(composite(() => 0)).toMatch(/^unknown-/);
    expect(composite(Symbol("key"))).toMatch(/^unknown-/);
  });
  it("groups dates at calendar boundaries and omits items older than thirty days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 7, 12));
    const dates = [
      new Date(2026, 9, 7),
      new Date(2026, 8, 30),
      new Date(2026, 8, 7),
      new Date(2026, 8, 6),
    ];
    expect(groupByDays(dates, (date) => date)).toEqual({
      today: [dates[0]],
      last7Days: [dates[1]],
      last30Days: [dates[2]],
    });
    expect(getTimeGroups(dates[0]!)).toEqual({
      startOfTodayTime: dates[0]!.getTime(),
      sevenDaysAgoTime: dates[1]!.getTime(),
      thirtyDaysAgoTime: dates[2]!.getTime(),
    });
  });
});

it("distinguishes array order and length from objects with numeric keys", () => {
  const array = ["first", "second"];
  expect(composite(array)).not.toBe(composite({ 0: "first", 1: "second" }));
  expect(composite(array)).toBe(composite(["first", "second"]));
  expect(composite(array)).toBe(composite(array));
  expect(composite([1])).not.toBe(composite([1, undefined]));
});
