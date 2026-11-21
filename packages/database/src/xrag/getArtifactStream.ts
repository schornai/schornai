import type { SupabaseClient } from "../_shared/_types.ts";
import { getArtifactDownloadUrl } from "./getArtifactDownloadUrl.ts";

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
  const url = await getArtifactDownloadUrl(path, { supabase });
  const response = await fetch(url, {
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
