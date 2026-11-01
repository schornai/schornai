import { afterEach, expect, test, vi } from "vitest";
import { getOllamaModelIdentifiers } from "./getOllamaModelIdentifiers.ts";

afterEach(() => vi.unstubAllGlobals());

test("workers accept the untagged alias only for installed latest models", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        data: [
          { id: "qwen3.8:latest" },
          { id: "team/model:latest" },
          { id: "other:7b" },
          { id: "qwen3.8" },
          { id: 42 },
          null,
        ],
      }),
    ),
  );

  const identifiers = await getOllamaModelIdentifiers("http://ollama.test");
  expect(identifiers).toEqual([
    "qwen3.8:latest",
    "qwen3.8",
    "team/model:latest",
    "team/model",
    "other:7b",
  ]);
  expect(identifiers).not.toContain("other");
});
