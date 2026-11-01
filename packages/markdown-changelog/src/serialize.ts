import type { MDC, Version } from "./types.ts";

function serializeVersions(version: Version) {
  const longestChange =
    version.changes.reduce(
      (max, change) => Math.max(max, change.change.length),
      0,
    ) + 2;
  return (
    `## Version ${version.version}\n\n` +
    `${version.date.toISOString()}\n\n` +
    `| action | row | ${"change".padEnd(longestChange, " ")} |\n` +
    `| ------ | --- | ${"".padEnd(longestChange, "-")} |\n` +
    version.changes
      .map(
        (change) =>
          `| ${change.action.padEnd(6, " ")} | ${change.row.toString().padEnd(3, " ")} | ${"`"}${change.change.replaceAll("`", "\\`")}${"`".padEnd(longestChange - change.change.replaceAll("`", "\\`").length - 1, " ")} |`,
      )
      .join("\n") +
    "\n"
  );
}

export function serializeMDC(mdc: MDC, changelogStart = "\n# CHANGELOG") {
  return `${mdc.current}${changelogStart}\n\n${mdc.versions.map(serializeVersions).join("\n")}`;
}
