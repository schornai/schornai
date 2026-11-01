import type { StorageRealtimeSession } from "./_types.ts";
import { createFile } from "./createFile.ts";
import { inspect } from "./inspect.ts";
import { validateFileName, validateStoragePath } from "./validatePath.ts";

export async function createTextFile(
  {
    basePath,
    name,
    content,
  }: { basePath: string; name: string; content: string },
  session: StorageRealtimeSession,
) {
  const folder = validateStoragePath(basePath, { allowRoot: true });
  const filename = validateFileName(name);
  if (new TextEncoder().encode(content).byteLength > 1024 * 1024)
    throw new Error("TEXT_FILE_TOO_LARGE");
  if (!(await inspect(folder, session))?.folder)
    throw new Error("TARGET_FOLDER_NOT_FOUND");
  const path = [folder, filename].filter(Boolean).join("/");
  if (await inspect(path, session)) throw new Error("FILE_ALREADY_EXISTS");
  return createFile(
    new Blob([content], {
      type: filename.toLowerCase().endsWith(".md")
        ? "text/markdown;charset=utf-8"
        : "text/plain;charset=utf-8",
    }),
    path,
    session,
    { upsert: false },
  );
}
