import { readFile, readdir } from "node:fs/promises";
import ts from "typescript";

const shadcn = new Set(
  "alert alert-dialog attachment avatar badge breadcrumb bubble button card checkbox collapsible combobox context-menu dialog dropdown-menu empty field input input-group label marker message message-scroller pagination progress select separator sheet sidebar skeleton slider switch table tabs textarea tooltip".split(
    " ",
  ),
);
const nonVisual = new Set(["error-log", "error-log-client"]);
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? files(`${directory}/${entry.name}`)
          : [`${directory}/${entry.name}`],
      ),
    )
  ).flat();
}
const missing = [];
let count = 0;
for (const [sourceRoot, storiesRoot, previewFile] of [
  ["apps/web/app", "apps/web/stories", "apps/web/.storybook/preview.tsx"],
  [
    "packages/ui/src/components",
    "packages/ui/src/components",
    "packages/ui/.storybook/preview.tsx",
  ],
  [
    "apps/admin-mac/src/renderer/components",
    "apps/admin-mac/stories",
    "apps/admin-mac/.storybook/preview.tsx",
  ],
]) {
  const stories = (await files(storiesRoot)).filter((file) =>
    file.endsWith(".stories.tsx"),
  );
  const storySources = await Promise.all(
    stories.map(async (file) => ({ file, text: await readFile(file, "utf8") })),
  );
  const preview = await readFile(previewFile, "utf8");
  for (const file of await files(sourceRoot)) {
    if (!file.endsWith(".tsx") || file.endsWith(".stories.tsx")) continue;
    if (sourceRoot === "apps/web/app" && !file.includes("/_components/"))
      continue;
    const base = file.split("/").at(-1).replace(".tsx", "");
    if (
      sourceRoot.startsWith("packages") &&
      (shadcn.has(base) || nonVisual.has(base))
    )
      continue;
    const text = await readFile(file, "utf8");
    const source = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    for (const node of source.statements) {
      if (
        !ts.isFunctionDeclaration(node) ||
        !node.name ||
        !/^[A-Z]/.test(node.name.text) ||
        !node.modifiers?.some(
          (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
        )
      )
        continue;
      const name = node.name.text;
      count++;
      const covered =
        storySources.some(
          (story) =>
            story.text.includes(name) && story.text.includes(`/${base}`),
        ) ||
        (name.endsWith("Provider") && preview.includes(name));
      if (!covered) missing.push(`${file}: ${name}`);
    }
  }
  if (sourceRoot.startsWith("packages")) {
    for (const story of storySources) {
      const base = story.file.split("/").at(-1).replace(".stories.tsx", "");
      if (shadcn.has(base))
        missing.push(
          `shadcn component must not have its own story: ${story.file}`,
        );
    }
  }
}
if (missing.length) {
  console.error(missing.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Coverage inventory passed: ${count} custom component exports; shadcn primitives excluded.`,
  );
