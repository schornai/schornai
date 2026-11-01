import type { MDC, Version } from "./types.ts";

function pickUntil<T>(array: T[], predicate: (item: T) => boolean) {
  const result: T[] = [];
  for (const item of array) {
    result.push(item);
    if (predicate(item)) {
      break;
    }
  }
  return result;
}

function revertVersion(current: string, version: Version) {
  const revertedContent = current.split("\n");

  for (const change of version.changes.toReversed()) {
    switch (change.action) {
      case "add": {
        revertedContent.splice(change.row - 1, 1);
        break;
      }
      case "delete": {
        revertedContent.splice(change.row - 1, 0, change.change);
        break;
      }
    }
  }

  return revertedContent.join("\n");
}

export function restoreVersion(mdc: MDC, version: number) {
  const versionsToRevert = pickUntil(
    mdc.versions,
    ({ version: thisVersion }) => thisVersion === version,
  );

  let revertedContent = mdc.current;
  for (const versionToRevert of versionsToRevert) {
    revertedContent = revertVersion(revertedContent, versionToRevert);
  }

  return revertedContent;
}
