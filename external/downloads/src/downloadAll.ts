import { container } from "./container.ts";
import { ffmpeg } from "./ffmpeg.ts";
import { node } from "./node.ts";
import { ollama } from "./ollama.ts";
import { replaceDirectory } from "./util/replaceDirectory.ts";
import { runDownload } from "./util/runDownload.ts";

export async function downloadAll(target: string) {
  await replaceDirectory(target, async (directory) => {
    await container(directory);
    await ffmpeg(directory);
    await node(directory);
    await ollama(directory);
  });
}

runDownload(import.meta.url, downloadAll);
