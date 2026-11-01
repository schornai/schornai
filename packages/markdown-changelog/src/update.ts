import { diffArrays } from "diff";
import type { RowChange } from "./types.ts";
import { parseMDC } from "./parse.ts";
import { serializeMDC } from "./serialize.ts";

function diff(oldContent: string, newContent: string) {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");

  let currentRow = 1;
  let addOvershoot = 0;

  const changes: RowChange[] = [];

  for (const patch of diffArrays(oldLines, newLines)) {
    if (patch.added) {
      currentRow -= addOvershoot;
      for (const patchRow of patch.value) {
        changes.push({
          action: "add",
          change: patchRow,
          row: currentRow,
        });
        currentRow++;
        addOvershoot--;
      }
      continue;
    }
    if (patch.removed) {
      currentRow += addOvershoot;
      for (const patchRow of patch.value) {
        changes.push({
          action: "delete",
          change: patchRow,
          row: currentRow,
        });
        currentRow++;
        addOvershoot++;
      }
      continue;
    }

    currentRow += patch.count;
  }

  return changes;
}

export function updateMDC(
  oldMDCString: string,
  newMDCString: string,
  date: Date = new Date(),
) {
  const oldMDC = parseMDC(oldMDCString);
  const newMDC = parseMDC(newMDCString);

  const changes = diff(oldMDC.current, newMDC.current);
  const oldVersion = oldMDC.versions[0]?.version ?? 0;

  return serializeMDC({
    current: newMDC.current,
    versions: [
      {
        changes,
        date,
        version: oldVersion + 1,
      },
      ...oldMDC.versions,
    ],
  });
}
