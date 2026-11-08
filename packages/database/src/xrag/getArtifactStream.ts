import type { SupabaseClient } from "../_shared/_types.ts";
import { XRAG_BUCKET } from "./_schema.ts";

/** Server-only; never send this signed Storage URL or credentials to the browser. */
export async function getArtifactStream(
  path: string,
  {
    supabase,
    signal,
    range,
  }: {
    supabase: SupabaseClient;
    signal?: AbortSignal;
    range?: { start: number; end: number; size: number };
  },
) {
  if (
    range &&
    (!Number.isSafeInteger(range.start) ||
      !Number.isSafeInteger(range.end) ||
      !Number.isSafeInteger(range.size) ||
      range.start < 0 ||
      range.end < range.start ||
      range.end >= range.size)
  )
    throw new Error("ARTIFACT_INVALID_RANGE");
  const { data, error } = await supabase.storage
    .from(XRAG_BUCKET)
    .createSignedUrl(path, 3600);
  if (error || !data) throw new Error("ARTIFACT_UNAVAILABLE");
  const response = await fetch(data.signedUrl, {
    signal,
    cache: "no-store",
    ...(range
      ? { headers: { Range: `bytes=${range.start}-${range.end}` } }
      : {}),
  });
  if (
    !response.ok ||
    !response.body ||
    (range &&
      (response.status !== 206 ||
        response.headers.get("content-range") !==
          `bytes ${range.start}-${range.end}/${range.size}`))
  ) {
    await response.body?.cancel().catch(() => {});
    throw new Error("ARTIFACT_UNAVAILABLE");
  }
  return response.body;
}
