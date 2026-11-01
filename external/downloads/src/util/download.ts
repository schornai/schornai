/* eslint-disable no-console */
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

export async function download(url: string, targetPath: string) {
  console.time(`DOWNLOAD: ${url}`);
  await mkdir(dirname(targetPath), { recursive: true });
  const partial = `${targetPath}.${randomUUID()}.part`;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15 * 60_000),
      cache: "no-store",
    });
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
