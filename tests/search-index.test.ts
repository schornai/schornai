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
  function indexingDatabase() {
    const { supabase, builders } = database({
      source_objects: { count: 0 },
      text_searches: { data: null },
      embeddings_768: { data: null },
    });
    const sourcesRead = query({ data: [{ id: "old" }] });
    const sourcesWrite = query({ data: { id: "new" } });
    let sourcesCalls = 0;
    const original = supabase.from.getMockImplementation()!;
    supabase.from.mockImplementation((table) =>
      table === "sources"
        ? ++sourcesCalls === 1
          ? sourcesRead
          : sourcesWrite
        : original(table),
    );
    return { supabase, builders, sourcesRead, sourcesWrite };
  }
  it("deletes old sources in bounded batches before returning for an inactive index", async () => {
    const { supabase, builders, sourcesWrite } = indexingDatabase();
    await createIndex(file, "text", { id: "repo" } as any, storage, {
      supabase,
      embeddingModel: vi.fn(),
    } as any);
    expect(builders.source_objects!.limit).toHaveBeenCalledWith(100);
    expect(sourcesWrite.delete).toHaveBeenCalled();
    expect(sourcesWrite.insert).not.toHaveBeenCalled();
  });
  it("chunks and batches keyword and embedding writes, preserving source offsets", async () => {
    const { supabase, builders, sourcesWrite } = indexingDatabase();
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
    };
    await createIndex(file, "word ".repeat(8500), repository as any, storage, {
      supabase,
      embeddingModel: () => ({ modelId: "embed" }),
      abortSignal: signal,
    } as any);
    expect(sourcesWrite.insert).toHaveBeenCalledWith({
      database_id: "repo",
      mime_type: "text/plain",
      name: "file.txt",
      url: "database_files/workspace/repo/file.txt",
    });
    expect(builders.source_objects!.insert).toHaveBeenCalledTimes(2);
    const first = builders.source_objects!.insert.mock.calls[0]![0];
    expect(first).toHaveLength(100);
    expect(first[0]).toMatchObject({ page: 0, source_id: "new" });
    expect(first[1].page).toBe(400);
    expect(builders.text_searches!.insert).toHaveBeenCalledTimes(2);
    expect(builders.embeddings_768!.insert).toHaveBeenCalledTimes(2);
    expect(ai.embedMany).toHaveBeenCalledTimes(2);
  });
  it("indexes short Unicode text without dropping its only chunk", async () => {
    const { supabase, builders } = indexingDatabase();
    await createIndex(
      file,
      "Grüße 世界",
      { id: "repo", index: { keyword: { active: true } } } as any,
      storage,
      { supabase, embeddingModel: vi.fn() } as any,
    );
    expect(builders.source_objects!.insert.mock.calls[0]![0]).toMatchObject([
      { content: "Grüße 世界", page: 0 },
    ]);
    expect(builders.text_searches!.insert.mock.calls[0]![0]).toMatchObject([
      { text_search_vector: "Grüße 世界" },
    ]);
  });
  it("can build just a keyword index with an empty content source", async () => {
    const { supabase, builders } = indexingDatabase();
    await createIndex(
      file,
      "",
      { id: "repo", index: { keyword: { active: true } } } as any,
      storage,
      { supabase, embeddingModel: vi.fn() } as any,
    );
    expect(builders.source_objects!.insert).not.toHaveBeenCalled();
    expect(ai.embedMany).not.toHaveBeenCalled();
  });
});
