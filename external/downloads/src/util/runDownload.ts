import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function runDownload(
  url: string,
  action: (target: string) => Promise<void>,
) {
  if (!process.argv[1] || resolve(process.argv[1]) !== fileURLToPath(url))
    return;
  const target = process.argv[2];
  if (!target) throw new Error("A download target directory is required.");
  if (process.platform !== "darwin" || process.arch !== "arm64")
    throw new Error("Native downloads require macOS on Apple Silicon.");
  action(resolve(target)).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
