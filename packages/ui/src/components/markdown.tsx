import { lazy, Suspense } from "react";
import { Code } from "./code.tsx";
import { ExhaustiveError } from "@schornio/aibox-package-utils/ExhaustiveError";
import { JSX } from "react/jsx-runtime";
import { Link } from "./link.tsx";
import type { Blockquote, Nodes } from "mdast";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmStrikethrough } from "micromark-extension-gfm-strikethrough";
import { gfmTable } from "micromark-extension-gfm-table";
import { gfmTaskListItem } from "micromark-extension-gfm-task-list-item";
import { gfmStrikethroughFromMarkdown } from "mdast-util-gfm-strikethrough";
import { gfmTableFromMarkdown } from "mdast-util-gfm-table";
import { gfmTaskListItemFromMarkdown } from "mdast-util-gfm-task-list-item";
import { math } from "micromark-extension-math";
import { mathFromMarkdown } from "mdast-util-math";
import { ContainerTable } from "./container-table.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table.tsx";
import { Checkbox } from "./checkbox.tsx";
import { logError } from "./error-log.tsx";
import { Alert, AlertDescription } from "./alert.tsx";
import {
  Info,
  Lightbulb,
  Megaphone,
  OctagonAlert,
  TriangleAlert,
} from "lucide-react";
import { CodeInline } from "./code-inline.tsx";

const MathLazy = lazy(() => import("./math.tsx"));

const supportedAlerts = [
  "[!NOTE]",
  "[!TIP]",
  "[!IMPORTANT]",
  "[!WARNING]",
  "[!CAUTION]",
] as const;

function extractAlert(blockquote: Blockquote) {
  // https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#alerts
  const firstChild = blockquote.children[0];

  if (firstChild?.type !== "paragraph") {
    return undefined;
  }

  const firstParagraphChild = firstChild.children[0];

  if (firstParagraphChild?.type !== "text") {
    return undefined;
  }

  const firstParagraphText = firstParagraphChild.value;

  for (const supportedAlert of supportedAlerts) {
    if (firstParagraphText.startsWith(supportedAlert)) {
      const newFirstParagraphText = firstParagraphText
        .replace(supportedAlert, "")
        .trimStart();

      return {
        ...blockquote,
        alert: supportedAlert,
        children: blockquote.children.map((blockqouteChild, index) =>
          index === 0 && blockqouteChild.type === "paragraph"
            ? {
                ...blockqouteChild,
                children: blockqouteChild.children.map(
                  (blockqouteChildChild, index) =>
                    index === 0 && blockqouteChildChild.type === "text"
                      ? {
                          ...blockqouteChildChild,
                          value: newFirstParagraphText,
                        }
                      : blockqouteChildChild,
                ),
              }
            : blockqouteChild,
        ),
      };
    }
  }

  return undefined;
}

export function Markdown({
  children: mdast,
}: {
  children?: string | Nodes | Nodes[] | null;
}) {
  if (!mdast) {
    return undefined;
  }

  if (typeof mdast === "string") {
    const actualMdast = fromMarkdown(mdast, {
      extensions: [gfmStrikethrough(), gfmTable(), gfmTaskListItem(), math()],
      mdastExtensions: [
        gfmStrikethroughFromMarkdown(),
        gfmTableFromMarkdown(),
        gfmTaskListItemFromMarkdown(),
        mathFromMarkdown(),
      ],
    });

    return <Markdown>{actualMdast}</Markdown>;
  }

  if (Array.isArray(mdast)) {
    return (
      <>
        {mdast.map((mdastChild, index) => (
          <Markdown key={`${index}-${mdastChild.type}`}>{mdastChild}</Markdown>
        ))}
      </>
    );
  }

  switch (mdast.type) {
    case "blockquote": {
      const blockquote = extractAlert(mdast);

      switch (blockquote?.alert) {
        case "[!CAUTION]":
          return (
            <Alert className="prose-p:my-0 my-5 border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-50">
              <OctagonAlert />
              <AlertDescription>
                <Markdown>{blockquote.children}</Markdown>
              </AlertDescription>
            </Alert>
          );
        case "[!IMPORTANT]":
          return (
            <Alert className="prose-p:my-0 my-5 border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900 dark:border-fuchsia-900 dark:bg-fuchsia-950 dark:text-fuchsia-50">
              <Megaphone />
              <AlertDescription>
                <Markdown>{blockquote.children}</Markdown>
              </AlertDescription>
            </Alert>
          );
        case "[!NOTE]":
          return (
            <Alert className="prose-p:my-0 my-5 border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-50">
              <Info />
              <AlertDescription>
                <Markdown>{blockquote.children}</Markdown>
              </AlertDescription>
            </Alert>
          );
        case "[!TIP]":
          return (
            <Alert className="prose-p:my-0 my-5 border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-50">
              <Lightbulb />
              <AlertDescription>
                <Markdown>{blockquote.children}</Markdown>
              </AlertDescription>
            </Alert>
          );
        case "[!WARNING]":
          return (
            <Alert className="prose-p:my-0 my-5 border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
              <TriangleAlert />
              <AlertDescription>
                <Markdown>{blockquote.children}</Markdown>
              </AlertDescription>
            </Alert>
          );
      }

      return (
        <blockquote className="border-l-4 pl-2">
          <Markdown>{mdast.children}</Markdown>
        </blockquote>
      );
    }
    case "break":
      return <br />;
    case "code":
      return mdast.value.length > 0 ? (
        <Code lang={mdast.lang ?? undefined}>{mdast.value}</Code>
      ) : undefined;
    case "delete":
      return (
        <del>
          <Markdown>{mdast.children}</Markdown>
        </del>
      );
    case "emphasis":
      return (
        <em>
          <Markdown>{mdast.children}</Markdown>
        </em>
      );
    case "heading": {
      const Heading = `h${mdast.depth}` as keyof JSX.IntrinsicElements;
      return (
        <Heading>
          <Markdown>{mdast.children}</Markdown>
        </Heading>
      );
    }
    case "html": {
      if (mdast.value.match(/^<br\/?>$/iu)) {
        return <br />;
      }
      return (
        <code className="bg-muted rounded-sm p-0.5 font-mono text-sm">
          {mdast.value}
        </code>
      );
    }
    case "image":
      return <img alt={mdast.alt ?? undefined} src={mdast.url} />;
    case "inlineCode":
      return <CodeInline>{mdast.value}</CodeInline>;
    case "inlineMath":
      return (
        <Suspense>
          <MathLazy>{mdast.value}</MathLazy>
        </Suspense>
      );
    case "link": {
      return (
        <Link href={mdast.url}>
          <Markdown>{mdast.children}</Markdown>
        </Link>
      );
    }
    case "list": {
      if (mdast.children.every((child) => typeof child.checked === "boolean")) {
        return (
          <ul className="list-none pl-1.5">
            <Markdown>{mdast.children}</Markdown>
          </ul>
        );
      }
      if (mdast.ordered) {
        return (
          <ol className="list-decimal pl-6">
            <Markdown>{mdast.children}</Markdown>
          </ol>
        );
      }
      return (
        <ul className="list-disc pl-6">
          <Markdown>{mdast.children}</Markdown>
        </ul>
      );
    }
    case "listItem":
      if (typeof mdast.checked === "boolean") {
        return (
          <li className="relative pl-6">
            <Checkbox
              checked={mdast.checked}
              className="absolute top-1 left-0"
              disabled
            />
            <Markdown>{mdast.children}</Markdown>
          </li>
        );
      }
      return (
        <li>
          <Markdown>{mdast.children}</Markdown>
        </li>
      );
    case "math":
      return (
        <Suspense>
          {/* todo?: hier ein div rum weils nicht "inlineMath" ist? */}
          <MathLazy>{mdast.value}</MathLazy>
        </Suspense>
      );
    case "paragraph":
      return (
        <p>
          <Markdown>{mdast.children}</Markdown>
        </p>
      );
    case "root":
      return <Markdown>{mdast.children}</Markdown>;
    case "strong":
      return (
        <strong>
          <Markdown>{mdast.children}</Markdown>
        </strong>
      );
    case "table":
      return (
        <ContainerTable className="not-prose mb-5">
          <Table>
            {mdast.children[0] ? (
              <TableHeader>
                <TableRow>
                  {mdast.children[0].children.map((cell, index) => (
                    <TableHead
                      className={cn({
                        "text-center": mdast.align?.[index] === "center",
                        "text-right": mdast.align?.[index] === "right",
                      })}
                      key={index}
                    >
                      <Markdown>{cell.children}</Markdown>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
            ) : undefined}
            {mdast.children.length > 1 ? (
              <TableBody>
                {mdast.children.slice(1).map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {row.children.map((cell, cellIndex) => (
                      <TableCell
                        className={cn({
                          "text-center": mdast.align?.[cellIndex] === "center",
                          "text-right": mdast.align?.[cellIndex] === "right",
                        })}
                        key={cellIndex}
                      >
                        <Markdown>{cell.children}</Markdown>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            ) : undefined}
          </Table>
        </ContainerTable>
      );
    case "tableCell":
      return (
        <TableCell>
          <Markdown>{mdast.children}</Markdown>
        </TableCell>
      );
    case "tableRow":
      return (
        <TableRow>
          <Markdown>{mdast.children}</Markdown>
        </TableRow>
      );
    case "text":
      return mdast.value;
    case "thematicBreak":
      return <hr className="my-8" />;
    case "definition":
    case "footnoteDefinition":
    case "footnoteReference":
    case "imageReference":
    case "linkReference":
    case "mdxJsxFlowElement":
    case "mdxJsxTextElement":
    case "yaml": {
      const message = `Not implemented: ${mdast.type}`;
      logError("Markdown not implemented", new Error(message));
      return <>{message}</>;
    }
    default:
      logError("Markdown exhaustive error", mdast);
      throw new ExhaustiveError(mdast);
  }
}
