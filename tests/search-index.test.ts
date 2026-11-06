import { beforeEach, describe, expect, it, vi } from "vitest";
import { database, query } from "./helpers/supabase";
import { searchDocuments } from "../packages/database/src/documentRepositories/searchDocuments";
import { searchDocumentsByKeywords } from "../packages/database/src/documentRepositories/searchDocumentsByKeywords";
import { searchDocumentsBySemantic } from "../packages/database/src/documentRepositories/searchDocumentsBySemantic";
import { createIndex } from "../packages/database/src/storage/createIndex";
const ai = vi.hoisted(() => ({ embed: vi.fn(), embedMany: vi.fn() }));
vi.mock("ai", () => ({ embed: ai.embed, embedMany: ai.embedMany }));
beforeEach(() => {
  ai.embed.mockReset().mockResolvedValue({ embedding: [1, 2] });
  ai.embedMany.mockReset().mockImplementation(async ({ values }) => ({
    embeddings: values.map(() => [1, 2]),
  }));
});
const source = {
  id: "source",
  name: "file.pdf",
  url: "database_files/workspace/repo/folder/file.pdf",
  mime_type: "application/pdf",
  created_at: "2026-01-01",
};
const sourceObject = {
  id: "object",
  content: "Digest",
  page: 12,
  sources: source,
};
const signal = new AbortController().signal;

describe("document search", () => {
  it("scopes keywords, pagination and null relations while mapping source metadata", async () => {
    const { supabase, builders } = database({
      text_searches_with_sources: {
        data: [
          { source_objects: sourceObject },
          { source_objects: null },
          { source_objects: { ...sourceObject, page: null } },
        ],
      },
    });
    builders.text_searches_with_sources!.textSearch = vi.fn(
      () => builders.text_searches_with_sources,
    );
    const results = await searchDocumentsByKeywords("'one' | 'two'", "repo", {
      supabase,
      abortSignal: signal,
      skip: 2,
      limit: 3,
    } as any);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      digest: "Digest",
      digestOffset: 12,
      file: {
        path: "folder/file.pdf",
        readableContent: "text",
        name: "file.pdf",
      },
    });
    expect(results[1]!.digestOffset).toBe(0);
    expect(builders.text_searches_with_sources!.range).toHaveBeenCalledWith(
      2,
      4,
    );
    expect(builders.text_searches_with_sources!.eq).toHaveBeenCalledWith(
      "database_id",
      "repo",
    );
    expect(
      builders.text_searches_with_sources!.textSearch,
    ).toHaveBeenCalledWith("text_search_vector", "'one' | 'two'");
    const absent = database({ text_searches_with_sources: { data: null } });
    absent.builders.text_searches_with_sources!.textSearch = () =>
      absent.builders.text_searches_with_sources;
    expect(
      await searchDocumentsByKeywords("x", "repo", {
        supabase: absent.supabase,
        abortSignal: signal,
      } as any),
    ).toEqual([]);
    expect(
      absent.builders.text_searches_with_sources!.range,
    ).toHaveBeenCalledWith(0, 4);
  });
  it("uses the vector-size RPC and sorts matches by distance", async () => {
    const { supabase, builders } = database({
      source_objects: {
        data: [
          sourceObject,
          { ...sourceObject, id: "second", page: null },
          { ...sourceObject, id: "missing" },
        ],
      },
    });
    supabase.rpc.mockReturnValue(
      query({
        data: [
          { object_id: "object", product: 0.5 },
          { object_id: "second", product: 0.1 },
        ],
      }),
    );
    const result = await searchDocumentsBySemantic([1, 2], 768, "repo", {
      supabase,
      abortSignal: signal,
      limit: 3,
      skip: 2,
      threshold: 0.4,
    } as any);
    expect(supabase.rpc).toHaveBeenCalledWith("match_embeddings_768_v2", {
      param_database_id: "repo",
      param_embedding: [1, 2],
      param_limit: 3,
      param_offset: 2,
      param_threshold: 0.4,
    });
    expect(result.map((r) => r.embeddingDistance)).toEqual([0, 0.1, 0.5]);
    expect(builders.source_objects!.in).toHaveBeenCalledWith("id", [
      "object",
      "second",
    ]);
    expect(result[1]!.digestOffset).toBe(0);
    await searchDocumentsBySemantic([1], 384, "repo", {
      supabase,
      abortSignal: signal,
    } as any);
    expect(supabase.rpc).toHaveBeenLastCalledWith(
      "match_embeddings_384_v2",
      expect.objectContaining({
        param_limit: 5,
        param_offset: 0,
        param_threshold: 0,
      }),
    );
  });
  it("rejects a failed semantic RPC", async () => {
    const { supabase } = database();
    supabase.rpc.mockReturnValue(query({ error: { message: "rpc failed" } }));
    await expect(
      searchDocumentsBySemantic([1], 768, "repo", {
        supabase,
        abortSignal: signal,
      } as any),
    ).rejects.toBeInstanceOf(Error);
  });
  it("skips inactive search methods and escapes keyword quotes", async () => {
    const { supabase, builders } = database({
      text_searches_with_sources: { data: [] },
      source_objects: { data: [] },
    });
    builders.text_searches_with_sources!.textSearch = vi.fn(
      () => builders.text_searches_with_sources,
    );
    supabase.rpc.mockReturnValue(query({ data: [] }));
    const options = {
      supabase,
      embeddingModel: () => ({ modelId: "embed" }),
      abortSignal: signal,
    } as any;
    expect(await searchDocuments({ id: "repo" } as any, {}, options)).toEqual({
      documentsByKeywords: [],
      documentsBySemantic: [],
    });
    const repo = {
      id: "repo",
      index: {
        keyword: { active: true },
        embedding: {
          active: true,
          modelIdentifier: "embed",
          modelVectorSize: 768,
        },
      },
    };
    await searchDocuments(
      repo as any,
      { keywords: ["  one ", "two's", "   "], semantic: "Meaning" },
      options,
    );
    expect(
      builders.text_searches_with_sources!.textSearch,
    ).toHaveBeenCalledWith("text_search_vector", "'one' | 'two\\'s'");
    expect(ai.embed).toHaveBeenCalledWith(
      expect.objectContaining({ value: "Meaning" }),
    );
    await searchDocuments(repo as any, { semantic: "Meaning" }, {
      supabase,
    } as any);
    expect(ai.embed).toHaveBeenCalledOnce();
  });
});

describe("index creation", () => {
  const file = {
    file: true,
    name: "file.txt",
    path: "file.txt",
    type: "text/plain",
  } as any;
  const storage = {
    getStoragePath: () => ({ storagePath: "workspace/repo/file.txt" }),
  } as any;
  const repository = {
    id: "repo",
    index: {
      keyword: { active: true },
      embedding: {
        active: true,
        modelIdentifier: "embed",
        modelVectorSize: 768,
      },
    },
  } as any;
  function indexingDatabase() {
    const publish = vi.fn().mockResolvedValue({ data: null, error: null });
    const abortSignal = vi.fn(() => ({ throwOnError: publish }));
    const supabase = { rpc: vi.fn(() => ({ abortSignal })) } as any;
    return { supabase, publish, abortSignal };
  }
  beforeEach(() => {
    ai.embedMany.mockImplementation(async ({ values }) => ({
      embeddings: values.map(() => Array(768).fill(0.1)),
    }));
  });
  it("clears a disabled index in the same publication operation", async () => {
    const { supabase, publish } = indexingDatabase();
    await createIndex(file, "text", { id: "repo" } as any, storage, {
      supabase,
      embeddingModel: vi.fn(),
    });
    expect(supabase.rpc).toHaveBeenCalledWith(
      "replace_file_index",
      expect.objectContaining({
        p_repository_id: "repo",
        p_url: "database_files/workspace/repo/file.txt",
        p_keyword: false,
        p_embedding_dimension: 0,
        p_chunks: [],
      }),
    );
    expect(publish).toHaveBeenCalledOnce();
    expect(ai.embedMany).not.toHaveBeenCalled();
  });
  it("prepares all batches before publishing chunks, keywords and embeddings once", async () => {
    const { supabase, publish, abortSignal } = indexingDatabase();
    await createIndex(file, "word ".repeat(8500), repository, storage, {
      supabase,
      embeddingModel: () => ({ modelId: "embed" }) as any,
      abortSignal: signal,
    });
    expect(ai.embedMany).toHaveBeenCalledTimes(2);
    expect(supabase.rpc).toHaveBeenCalledOnce();
    const input = supabase.rpc.mock.calls[0][1];
    expect(input).toMatchObject({
      p_mime_type: "text/plain",
      p_name: "file.txt",
      p_keyword: true,
      p_embedding_dimension: 768,
    });
    expect(input.p_chunks).toHaveLength(107);
    expect(input.p_chunks[0]).toMatchObject({
      page: 0,
      embedding: Array(768).fill(0.1),
    });
    expect(input.p_chunks[1].page).toBe(400);
    expect(input.p_chunks[100].embedding).toHaveLength(768);
    expect(publish.mock.invocationCallOrder[0]).toBeGreaterThan(
      ai.embedMany.mock.invocationCallOrder[1]!,
    );
    expect(abortSignal).toHaveBeenCalledWith(signal);
  });
  it("does not touch the old index when a later embedding batch fails", async () => {
    const { supabase } = indexingDatabase();
    ai.embedMany
      .mockResolvedValueOnce({
        embeddings: Array.from({ length: 100 }, () => Array(768).fill(0.1)),
      })
      .mockRejectedValueOnce(new Error("model unavailable"));
    await expect(
      createIndex(file, "word ".repeat(8500), repository, storage, {
        supabase,
        embeddingModel: vi.fn(),
      }),
    ).rejects.toThrow("model unavailable");
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
  it.each(
    [[], [[1]], [Array(768).fill(NaN)]].map((embeddings) => ({ embeddings })),
  )(
    "rejects incomplete or invalid vectors before publication",
    async ({ embeddings }) => {
      const { supabase } = indexingDatabase();
      ai.embedMany.mockResolvedValue({ embeddings });
      await expect(
        createIndex(file, "text", repository, storage, {
          supabase,
          embeddingModel: vi.fn(),
        }),
      ).rejects.toThrow("INVALID_FILE_EMBEDDINGS");
      expect(supabase.rpc).not.toHaveBeenCalled();
    },
  );
  it("does not publish after cancellation and propagates transaction failures", async () => {
    const { supabase, publish } = indexingDatabase();
    const controller = new AbortController();
    controller.abort(new Error("cancelled"));
    await expect(
      createIndex(file, "text", repository, storage, {
        supabase,
        embeddingModel: vi.fn(),
        abortSignal: controller.signal,
      }),
    ).rejects.toThrow("cancelled");
    expect(supabase.rpc).not.toHaveBeenCalled();
    publish.mockRejectedValueOnce(new Error("transaction failed"));
    await expect(
      createIndex(file, "text", repository, storage, {
        supabase,
        embeddingModel: vi.fn(),
      }),
    ).rejects.toThrow("transaction failed");
  });
  it("preserves the existing index when embedding configuration is incomplete", async () => {
    const { supabase } = indexingDatabase();
    await expect(
      createIndex(
        file,
        "text",
        { id: "repo", index: { embedding: { active: true } } } as any,
        storage,
        { supabase, embeddingModel: vi.fn() },
      ),
    ).rejects.toThrow("INVALID_EMBEDDING_CONFIGURATION");
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
  it.each(["Grüße 世界", ""])(
    "publishes keyword-only text including empty content: %s",
    async (text) => {
      const { supabase } = indexingDatabase();
      await createIndex(
        file,
        text,
        { id: "repo", index: { keyword: { active: true } } } as any,
        storage,
        { supabase, embeddingModel: vi.fn() },
      );
      expect(supabase.rpc.mock.calls[0][1].p_chunks).toEqual(
        text ? [{ content: text, page: 0, searchText: text }] : [],
      );
      expect(ai.embedMany).not.toHaveBeenCalled();
    },
  );
});
