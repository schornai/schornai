import type { Point } from "unist";
import type { RootContent } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmTable } from "micromark-extension-gfm-table";
import { gfmTableFromMarkdown } from "mdast-util-gfm-table";
import type { MDC, RowChange, Version } from "./types.ts";

export function trySync<T>(
  fn: () => T,
): { data: T; error: undefined } | { data: undefined; error: unknown } {
  try {
    const data = fn();
    return { data, error: undefined };
  } catch (error) {
    return { data: undefined, error };
  }
}

function formatPoint(point?: Point) {
  if (!point) return "";
  return `Line: ${point.line} | Column: ${point.column}`;
}

function parseContent<T extends RootContent, TType extends T["type"]>(
  content: T | undefined,
  type: TType,
  ref: string,
): Extract<T, { type: TType }> {
  if (content?.type !== type)
    throw new Error(
      `[${ref}] Expected: "${type}". Actual: "${content?.type}". ${formatPoint(content?.position?.start)}`,
    );

  return content as Extract<T, { type: TType }>;
}

function parseNumberedVersionHeading(versionHeading?: RootContent) {
  if (versionHeading?.type !== "heading")
    throw new Error(
      `Expected: "heading". Actual: "${versionHeading?.type}". ${formatPoint(versionHeading?.position?.start)}`,
    );

  const versionHeadingText = versionHeading.children.at(0);

  if (versionHeadingText?.type !== "text")
    throw new Error(
      `Expected: "text". Actual: "${versionHeadingText?.type}". ${formatPoint(versionHeadingText?.position?.start)}`,
    );

  const [, versionString] =
    versionHeadingText.value.match(/^Version (\d+)$/iu) ?? [];

  const version = parseInt(versionString ?? "NaN");

  if (Number.isNaN(version))
    throw new Error(
      `Expected: "Version <number>". Actual: "${versionHeadingText.value}". ${formatPoint(versionHeadingText?.position?.start)}`,
    );

  return version;
}

function parseDate(mdastChild?: RootContent) {
  const dateParagraph = parseContent(mdastChild, "paragraph", "dateParagraph");

  const dateParagraphText = parseContent(
    dateParagraph.children.at(0),
    "text",
    "dateParagraphText",
  );

  const date = new Date(dateParagraphText.value);

  if (Number.isNaN(date.getTime()))
    throw new Error(
      `Expected: "date". Actual: "${date.toString()}". ${formatPoint(dateParagraphText?.position?.start)}`,
    );

  return date;
}

function parseRowChanges(changesTable?: RootContent) {
  if (changesTable?.type !== "table")
    throw new Error(
      `Expected: "table". Actual: "${changesTable?.type}". ${formatPoint(changesTable?.position?.start)}`,
    );

  const changesTableRows = changesTable.children;
  changesTableRows.shift(); // ignore heading row

  const changes: RowChange[] = [];

  for (const tableRow of changesTableRows) {
    const actionCell = tableRow.children[0]?.children[0];
    const actionString = parseContent(actionCell, "text", "actionString").value;
    const action = (() => {
      switch (actionString) {
        case "add":
        case "delete":
          return actionString;
        default:
          throw new Error(
            `Expected: "add" or "delete". Actual: "${actionString}". ${formatPoint(actionCell?.position?.start)}`,
          );
      }
    })();

    const rowCell = tableRow.children[1]?.children[0];
    const rowString = parseContent(rowCell, "text", "rowString").value.trim();
    const row = parseInt(rowString);
    if (Number.isNaN(row)) {
      throw new Error(
        `Expected: number. Actual: "${rowString}". ${formatPoint(rowCell?.position?.start)}`,
      );
    }

    const changeCell = tableRow.children[2]?.children[0];
    const change = changeCell
      ? (trySync(() => parseContent(changeCell, "inlineCode", "change").value)
          .data ?? "")
      : "";

    changes.push({
      action,
      change,
      row,
    });
  }

  return changes;
}

function parseChangelog(changelogString: string) {
  const mdast = fromMarkdown(changelogString, {
    extensions: [gfmTable()],
    mdastExtensions: [gfmTableFromMarkdown()],
  });

  const versions: Version[] = [];

  const mdastChildIterator = mdast.children[Symbol.iterator]();
  let mdastChildVersion = mdastChildIterator.next();

  while (!mdastChildVersion.done) {
    const version = parseNumberedVersionHeading(mdastChildVersion.value);
    const date = parseDate(mdastChildIterator.next().value);
    const changes = parseRowChanges(mdastChildIterator.next().value);

    mdastChildVersion = mdastChildIterator.next();

    versions.push({
      changes,
      date,
      version,
    });
  }

  return versions;
}

export function parseMDC(doc: string, changelogStart = "\n# CHANGELOG"): MDC {
  const changelogStringSegments = doc.split(changelogStart);

  if (changelogStringSegments.length === 1 && !doc.startsWith(changelogStart)) {
    return {
      current: doc,
      versions: [],
    };
  }

  const changelogString = changelogStringSegments.pop();

  const current = changelogStringSegments.join(changelogStart);
  const versions = changelogString ? parseChangelog(changelogString) : [];

  return {
    current,
    versions,
  };
}
