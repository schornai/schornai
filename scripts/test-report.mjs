import fs from "node:fs";
import path from "node:path";
import { scope } from "./test-scope.mjs";
const root = path.resolve(import.meta.dirname, "..");
const summary = JSON.parse(
  fs.readFileSync(path.join(root, "coverage/coverage-summary.json"), "utf8"),
);
const python = JSON.parse(
  fs.readFileSync(path.join(root, "coverage/python/coverage.json"), "utf8"),
);
const metrics = ["lines", "statements", "functions", "branches"];
const rows = metrics.map((metric) => {
  const value = summary.total[metric];
  return `| ${metric} | ${value.covered}/${value.total} | ${value.pct}% |`;
});
const groups = {};
for (const [file, values] of Object.entries(summary)) {
  if (file === "total") continue;
  const name = path.relative(root, file).split(path.sep).slice(0, 2).join("/");
  groups[name] ??= { total: 0, covered: 0 };
  groups[name].total += values.lines.total;
  groups[name].covered += values.lines.covered;
}
const workspaceRows = Object.entries(groups).map(
  ([name, value]) =>
    `| ${name} | ${value.covered}/${value.total} | ${((100 * value.covered) / value.total).toFixed(2)}% |`,
);
const report = [
  "# Coverage-Ergebnis",
  "",
  "Erzeugt mit `npm run test:coverage` und `node scripts/test-report.mjs`.",
  "",
  "## JavaScript / TypeScript gesamt",
  "",
  "| Metrik | Abgedeckt / gesamt | Coverage |",
  "| --- | ---: | ---: |",
  ...rows,
  "",
  `Python-Transcriber: **${python.totals.percent_covered.toFixed(2)}%** kombinierte Zeilen-/Zweigabdeckung.`,
  "",
  "## Zeilen pro Workspace",
  "",
  "Die Zeilen-Grenze von 90% gilt zusätzlich für jeden Workspace. Statements, Funktionen und Zweige werden global geprüft.",
  "",
  "| Workspace | Abgedeckt / gesamt | Coverage |",
  "| --- | ---: | ---: |",
  ...workspaceRows,
  "",
  "Proxy und Tika haben Konfigurationstests, aber keine instrumentierbaren JavaScript-Anweisungen.",
  "",
  `Importanalyse: ${scope.files.length} Quelldateien im Umfang; ${scope.unreferenced.length} Package-Dateien ohne eingehenden Produktionsimport; ${scope.outsideAppGraph.length} Package-Dateien außerhalb des App-Graphen.`,
  "",
  "Die Liste ist in [unused-package-files.md](unused-package-files.md) dokumentiert. Externe Dienste sind an ihren Schnittstellen ersetzt; der Realtime-Persistenztest verwendet einen lokalen WebSocket-Server.",
  "",
].join("\n");
fs.mkdirSync(path.join(root, "reports"), { recursive: true });
fs.writeFileSync(path.join(root, "reports/coverage.md"), report);
console.log("Coverage summary saved to reports/coverage.md");
