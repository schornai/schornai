/* eslint-disable no-console */
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

async function fetchDownload(url: string, signal: AbortSignal) {
  const release =
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/releases\/download\/([^/]+)\/([^/?#]+)$/.exec(
      url,
    );
  if (!release) return fetch(url, { signal, cache: "no-store" });
  // Resolve the pinned release and platform directly through GitHub's asset API.
  const [, owner, repo, tag, filename] = release;
  const api = `https://api.github.com/repos/${owner}/${repo}/releases`;
  const metadata = await fetch(`${api}/tags/${tag}`, {
    signal,
    cache: "no-store",
  });
  if (!metadata.ok) {
    await metadata.body?.cancel();
    throw new Error(`GitHub release lookup failed: ${metadata.status}`);
  }
  const data = (await metadata.json()) as {
    assets?: { name: string; id: number }[];
  };
  const asset = data.assets?.find(
    (item) => item.name === decodeURIComponent(filename!),
  );
  if (!asset || !Number.isSafeInteger(asset.id) || asset.id <= 0)
    throw new Error(`GitHub release asset missing: ${filename}`);
  console.log(`Download through GitHub release API: ${filename}`);
  return fetch(`${api}/assets/${asset.id}`, {
    signal,
    cache: "no-store",
    headers: { Accept: "application/octet-stream" },
  });
}

export async function download(url: string, targetPath: string) {
  console.time(`DOWNLOAD: ${url}`);
  await mkdir(dirname(targetPath), { recursive: true });
  const partial = `${targetPath}.${randomUUID()}.part`;
  try {
    const response = await fetchDownload(url, AbortSignal.timeout(15 * 60_000));
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(
        `Failed to download ${url}: ${response.status} ${response.statusText}`,
      );
    }
    if (!response.body) throw new Error(`Empty download body: ${url}`);
    await writeFile(partial, response.body);
    await rename(partial, targetPath);
  } finally {
    await rm(partial, { force: true });
    console.timeEnd(`DOWNLOAD: ${url}`);
  }
}
