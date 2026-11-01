import { readFile } from "node:fs/promises";

async function main() {
  const readmeFilePath = process.argv[2] ?? "./README.md";
  const readme = await readFile(readmeFilePath, { encoding: "utf8" });
  const readmeLines = readme.split("\n");

  let withinSetup = false;
  let withinMultilineBash = false;

  const bashLines: string[] = [];

  for (const line of readmeLines) {
    if (line === "## Setup process") {
      withinSetup = true;
      continue;
    }

    if (withinSetup) {
      if (line.startsWith("## ")) {
        break;
      }

      if (line === "```bash") {
        withinMultilineBash = true;
        continue;
      }

      if (line === "```") {
        // bashLines.push('\n');
        withinMultilineBash = false;
      }

      if (withinMultilineBash) {
        bashLines.push(line);
      } else {
        if (line.startsWith("### ")) {
          bashLines.push(`\n\n${line.substring(2)}\n`);
        }
      }
    }
  }

  const extractedBash = bashLines.join("\n");
  console.log(extractedBash);
}

main().catch(console.error);
