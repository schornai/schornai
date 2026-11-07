/* eslint-disable no-console */
import { mkdir, rm } from "node:fs/promises";
import { download } from "./util/download.ts";
import { exec } from "./util/exec.ts";
import { probe } from "./util/probe.ts";
import { runDownload } from "./util/runDownload.ts";

const nodeVersion = "26.12.1";

export async function node(target: string) {
  await mkdir(target, { recursive: true });

  // --- node ---
  // FROM: https://nodejs.org/en/download
  await download(
    `https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-darwin-arm64.tar.gz`,
    `${target}/node.tar.gz`,
  );
  await mkdir(`${target}/node`, { recursive: true });
  await exec("tar", [
    "xzf",
    `${target}/node.tar.gz`,
    "--strip-components=2",
    "-C",
    `${target}/node`,
    `node-v${nodeVersion}-darwin-arm64/bin/node`,
  ]);
  await rm(`${target}/node.tar.gz`);
  await probe(`v${nodeVersion}`, `${target}/node/node`, ["--version"]);
}

runDownload(import.meta.url, node);
