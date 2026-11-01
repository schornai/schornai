import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fileToMarkdown } from "../packages/database/src/documentRepositories/fileToMarkdown";
import { readFileContent } from "../apps/realtime/src/processFile/readFileContent";
import tikaFixture from "./fixtures/tika/tables-and-lists.json";

const sourceHtml = readFileSync(
  new URL("./fixtures/tika/tables-and-lists.html", import.meta.url),
  "utf8",
);

beforeEach(() => {
  vi.stubEnv("DOCUMENT_EXTRACTOR_URL", "http://tika.test:9998");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe.each([
  { name: "database", read: fileToMarkdown },
  { name: "realtime", read: readFileContent },
])("$name Markdown extraction", ({ read }) => {
  it("preserves native Tika tables, escaped pipes and nested/ordered lists", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(tikaFixture.markdown, {
        headers: { "Content-Type": tikaFixture.contentType },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const file = new Blob([sourceHtml], { type: "text/html" });

    expect(await read(file)).toBe(tikaFixture.markdown);
    expect(fetch).toHaveBeenCalledWith(
      "http://tika.test:9998/tika/md",
      expect.objectContaining({
        method: "PUT",
        body: file,
        headers: { "Content-Type": "text/html" },
      }),
    );
  });

  it.each(["", " \n\t", "---\n\n***\n\n___", "|---|---|"])(
    "treats empty or formatting-only extraction %j as absent",
    async (markdown) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(markdown)));
      expect(await read(new Blob(["document"]))).toBeUndefined();
    },
  );

  it.each(["中文", "Ελληνικά", "العربية", "ß"])(
    "keeps non-ASCII content %s",
    async (markdown) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(markdown)));
      expect(await read(new Blob(["document"]))).toBe(markdown);
    },
  );

  it("propagates connection failures instead of treating them as empty documents", async () => {
    const error = new Error("connection refused");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));
    await expect(read(new Blob(["document"]))).rejects.toBe(error);
  });
});

it("rejects Tika errors in the database helper without exposing the response body", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response("internal parser details", { status: 500 }),
      ),
  );
  await expect(
    fileToMarkdown(new Blob(["document"], { type: "application/pdf" })),
  ).rejects.toThrow("Failed to fetch from Tika");
});

it("treats unsuccessful extraction as absent in the realtime worker", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response("internal parser details", { status: 500 }),
      ),
  );
  expect(await readFileContent(new Blob(["document"]))).toBeUndefined();
});

it("passes the worker's abort signal to Tika and propagates cancellation", async () => {
  const controller = new AbortController();
  controller.abort();
  const fetch = vi.fn().mockRejectedValue(controller.signal.reason);
  vi.stubGlobal("fetch", fetch);
  const file = new Blob(["document"], { type: "application/pdf" });
  await expect(readFileContent(file, controller.signal)).rejects.toBe(
    controller.signal.reason,
  );
  expect(fetch).toHaveBeenCalledWith(
    "http://tika.test:9998/tika/md",
    expect.objectContaining({ signal: controller.signal }),
  );
});

it("retains the TypeScript-file bypass without calling Tika", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const source = "export const value = 42;\n";
  expect(
    await fileToMarkdown(
      new File([source], "example.ts", { type: "application/octet-stream" }),
    ),
  ).toBe(source);
  expect(fetch).not.toHaveBeenCalled();
});

it("supports a custom Tika environment variable", async () => {
  vi.stubEnv("CUSTOM_TIKA_URL", "http://custom-tika.test:9998");
  const fetch = vi.fn().mockResolvedValue(new Response("# Document\n"));
  vi.stubGlobal("fetch", fetch);
  await fileToMarkdown(new Blob(["document"]), {
    environmentKeys: { apacheTikaUrl: "CUSTOM_TIKA_URL" },
  });
  expect(fetch).toHaveBeenCalledWith(
    "http://custom-tika.test:9998/tika/md",
    expect.any(Object),
  );
});

it("requires the configured Tika environment variable", async () => {
  vi.stubEnv("DOCUMENT_EXTRACTOR_URL", "");
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await expect(fileToMarkdown(new Blob())).rejects.toThrow(
    'Environment variable "DOCUMENT_EXTRACTOR_URL" not set.',
  );
  await expect(readFileContent(new Blob())).rejects.toThrow(
    'Missing environment variable: "DOCUMENT_EXTRACTOR_URL"',
  );
  expect(fetch).not.toHaveBeenCalled();
});
