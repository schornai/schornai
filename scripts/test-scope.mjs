import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const ignored = new Set([
  "node_modules",
  ".next",
  ".vite",
  "dist",
  "storybook-static",
  "venv",
  "__pycache__",
  "coverage",
  "tests",
  "test",
]);
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return ignored.has(entry.name) ? [] : walk(file);
    return /\.(?:[cm]?[jt]sx?)$/.test(file) &&
      !/\.(?:test|spec|d)\.ts[x]?$/.test(file)
      ? [file]
      : [];
  });
}
const relative = (file) => path.relative(root, file).replaceAll(path.sep, "/");
const files = ["apps", "packages"].flatMap((dir) => walk(path.join(root, dir)));
const fileSet = new Set(files);
const aliases = Object.fromEntries(
  fs.readdirSync(path.join(root, "packages")).flatMap((dir) => {
    const file = path.join(root, "packages", dir, "package.json");
    if (!fs.existsSync(file)) return [];
    const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
    return [[pkg.name, { dir: path.dirname(file), exports: pkg.exports }]];
  }),
);
aliases["@schornio/aibox-database"] =
  aliases["@schornio/aibox-package-database"];
function resolve(specifier, importer) {
  let target;
  if (specifier.startsWith("."))
    target = path.resolve(path.dirname(importer), specifier);
  else if (specifier.startsWith("@/"))
    target = path.join(root, "apps/web", specifier.slice(2));
  else {
    const name = specifier.startsWith("@")
      ? specifier.split("/").slice(0, 2).join("/")
      : specifier.split("/")[0];
    const pkg = aliases[name];
    if (!pkg) return;
    const subpath = "." + specifier.slice(name.length);
    const entry = Object.entries(pkg.exports ?? {})
      .sort(([a], [b]) => {
        if (a === subpath) return -1;
        if (b === subpath) return 1;
        return b.indexOf("*") - a.indexOf("*");
      })
      .find(
        ([key]) =>
          key === subpath ||
          (key.includes("*") &&
            subpath.startsWith(key.split("*")[0]) &&
            subpath.endsWith(key.split("*")[1])),
      );
    if (entry) {
      const [key, value] = entry;
      if (typeof value === "string")
        target = path.join(
          pkg.dir,
          key.includes("*")
            ? value.replace(
                "*",
                subpath.slice(
                  key.indexOf("*"),
                  key.split("*")[1] ? -key.split("*")[1].length : undefined,
                ),
              )
            : value,
        );
    }
  }
  if (!target) return;
  const candidates = [
    target,
    ...[".ts", ".tsx", ".mts", ".js", ".mjs", "/index.ts", "/index.tsx"].map(
      (ext) => target + ext,
    ),
  ];
  if (/\.jsx?$/.test(target))
    candidates.push(
      target.replace(/\.jsx?$/, ".ts"),
      target.replace(/\.jsx?$/, ".tsx"),
    );
  return candidates.find((file) => fileSet.has(file));
}
const imports = new Map();
const importedBy = new Map();
const unresolved = [];
for (const file of files) {
  const ast = ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const deps = new Set();
  function visit(node) {
    let specifier;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      specifier = node.moduleSpecifier;
    else if (ts.isImportTypeNode(node)) specifier = node.argument.literal;
    else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        node.expression.getText(ast) === "require")
    )
      specifier = node.arguments[0];
    if (specifier && ts.isStringLiteral(specifier)) {
      const target = resolve(specifier.text, file);
      if (target) {
        deps.add(target);
        if (!importedBy.has(target)) importedBy.set(target, new Set());
        importedBy.get(target).add(file);
      } else if (
        /^@schornio\//.test(specifier.text) &&
        !/\.css$/.test(specifier.text)
      )
        unresolved.push({ file: relative(file), specifier: specifier.text });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  imports.set(file, deps);
}
const configuration = (file) =>
  /(?:eslint\.config|rollup\.config|next\.config|postcss\.config|jest\.config)/.test(
    file,
  );
const appFiles = files.filter(
  (file) => relative(file).startsWith("apps/") && !configuration(file),
);
const reachable = new Set(appFiles);
const queue = [...appFiles];
for (const file of queue)
  for (const dependency of imports.get(file) ?? [])
    if (!reachable.has(dependency)) {
      reachable.add(dependency);
      queue.push(dependency);
    }
const packageFiles = files.filter((file) =>
  relative(file).startsWith("packages/"),
);
export const scope = {
  files: [...reachable]
    .filter((file) => !configuration(file))
    .map(relative)
    .sort(),
  unreferenced: packageFiles
    .filter((file) => !importedBy.has(file))
    .map(relative)
    .sort(),
  outsideAppGraph: packageFiles
    .filter((file) => !reachable.has(file))
    .map(relative)
    .sort(),
  importedBy: Object.fromEntries(
    [...importedBy].map(([file, parents]) => [
      relative(file),
      [...parents].map(relative).sort(),
    ]),
  ),
  unresolved,
};
if (process.argv[1] === import.meta.filename) {
  fs.mkdirSync(path.join(root, "reports"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "reports/test-scope.json"),
    JSON.stringify(scope, null, 2) + "\n",
  );
  const groups = Object.groupBy(scope.files, (file) =>
    file.split("/").slice(0, 2).join("/"),
  );
  console.log(
    Object.fromEntries(
      Object.entries(groups).map(([name, entries]) => [name, entries.length]),
    ),
  );
  const report = [
    "# Potentially unused package files",
    "",
    "Generated with `npm run test:scope`. Production imports, re-exports, literal dynamic imports, require calls and type imports are scanned with the TypeScript parser. Test imports never make production code appear used.",
    "",
    "These are review candidates, not deletion instructions. Framework entry points, build scripts, configuration, Python subprocesses and nonliteral dynamic imports can be used without a static import. No files have been deleted.",
    "",
    "## No incoming production import",
    "",
    ...scope.unreferenced.map((file) => `- \`${file}\``),
    "",
    "## Outside the apps dependency graph",
    "",
    "These files may be used by standalone package applications or tools, even when they have incoming imports.",
    "",
    ...scope.outsideAppGraph.map((file) => `- \`${file}\``),
    "",
    "## Unresolved internal imports",
    "",
    ...scope.unresolved.map(
      ({ file, specifier }) => `- \`${file}\`: \`${specifier}\``,
    ),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(root, "reports/unused-package-files.md"), report);
}
