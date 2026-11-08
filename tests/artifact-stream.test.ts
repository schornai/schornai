import { expect, it, vi } from "vitest";
import { getArtifactStream } from "../packages/database/src/xrag/getArtifactStream.ts";

it("streams a signed artifact URL with the caller's cancellation signal and no cache", async () => {
  const stream = new ReadableStream();
  const signed = vi.fn().mockResolvedValue({
    data: { signedUrl: "https://storage.test/private?token=test" },
    error: null,
  });
  const supabase = {
    storage: { from: vi.fn().mockReturnValue({ createSignedUrl: signed }) },
  } as any;
  const signal = new AbortController().signal;
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, body: stream }));
  await expect(
    getArtifactStream("staging/example.tar", { supabase, signal }),
  ).resolves.toBe(stream);
  expect(supabase.storage.from).toHaveBeenCalledWith("box-action-files");
  expect(signed).toHaveBeenCalledWith("staging/example.tar", 3600);
  expect(fetch).toHaveBeenCalledWith(
    "https://storage.test/private?token=test",
    { signal, cache: "no-store" },
  );
});

it.each([
  { data: null, error: null },
  { data: { signedUrl: "private" }, error: { message: "private details" } },
])("rejects unavailable signed URLs before fetching", async (result) => {
  const supabase = {
    storage: { from: () => ({ createSignedUrl: async () => result }) },
  } as any;
  await expect(getArtifactStream("archive", { supabase })).rejects.toThrow(
    "ARTIFACT_UNAVAILABLE",
  );
  expect(fetch).not.toHaveBeenCalled();
});

it.each([
  { ok: false, body: new ReadableStream() },
  { ok: true, body: null },
])("rejects unavailable or bodyless archive downloads", async (response) => {
  const supabase = {
    storage: {
      from: () => ({
        createSignedUrl: async () => ({
          data: { signedUrl: "https://storage.test/file" },
          error: null,
        }),
      }),
    },
  } as any;
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
  await expect(getArtifactStream("archive", { supabase })).rejects.toThrow(
    "ARTIFACT_UNAVAILABLE",
  );
});

it("forwards and validates a byte range without exposing the signed URL", async () => {
  const supabase = {
    storage: {
      from: () => ({
        createSignedUrl: async () => ({
          data: { signedUrl: "https://storage.test/private" },
          error: null,
        }),
      }),
    },
  } as any;
  const range = { start: 5, end: 9, size: 10 };
  const fetch = vi.fn(
    async () =>
      new Response("12345", {
        status: 206,
        headers: { "Content-Range": "bytes 5-9/10" },
      }),
  );
  vi.stubGlobal("fetch", fetch);
  const stream = await getArtifactStream("archive", { supabase, range });
  expect(await new Response(stream).text()).toBe("12345");
  expect(fetch).toHaveBeenCalledWith(
    "https://storage.test/private",
    expect.objectContaining({ headers: { Range: "bytes=5-9" } }),
  );
  fetch.mockResolvedValue(new Response("0123456789"));
  await expect(
    getArtifactStream("archive", { supabase, range }),
  ).rejects.toThrow("ARTIFACT_UNAVAILABLE");
});
