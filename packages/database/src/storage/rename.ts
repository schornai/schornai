import type { StorageRealtimeSession } from "./_types.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import { transferFile } from "./transferFile.ts";
import { validateFileName, validateStoragePath } from "./validatePath.ts";
import { renameFileIndex } from "./fileIndex.ts";

export async function rename(
  from: {
    path: string;
    storageSession: StorageRealtimeSession;
    supabase: SupabaseClient;
  },
  newName: string,
) {
  const path = validateStoragePath(from.path);
  const name = validateFileName(newName);
  // Changing the format would make existing extracted data misleading.
  const extension = (value: string) => {
    const base = value.split("/").at(-1)!;
    const index = base.lastIndexOf(".");
    return index > 0 ? base.slice(index).toLowerCase() : "";
  };
  if (extension(path) !== extension(name))
    throw new Error("FILE_EXTENSION_CHANGE_NOT_SUPPORTED");
  const destination = [...path.split("/").slice(0, -1), name].join("/");
  if (path === destination) throw new Error("SAME_FILE");
  return transferFile(
    from,
    { path: destination, storageSession: from.storageSession },
    {
      move: true,
      beforeRemove: () =>
        renameFileIndex(path, destination, from.storageSession, from.supabase),
    },
  );
}
