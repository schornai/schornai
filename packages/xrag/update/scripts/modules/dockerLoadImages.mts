import { opendir } from "node:fs/promises";
import { run } from "./run.mts";

export async function dockerLoadImages(imagesDir: string, dockerBin: string) {
  const dir = await opendir(imagesDir);
  for await (const entry of dir) {
    const { name } = entry;
    // AppleDouble sidecars are metadata, not Docker image archives.
    if (entry.isFile() && name.endsWith(".tar") && !name.startsWith("._")) {
      await run(dockerBin, ["load", "--input", `${imagesDir}/${name}`]);
    }
  }
}
