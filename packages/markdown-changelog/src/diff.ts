import { diffArrays } from "diff";
import type { RowChange } from "./types.ts";

export function diff(oldContent: string, newContent: string) {
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
