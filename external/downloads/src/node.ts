/* eslint-disable no-console */
import { mkdir, rm } from "node:fs/promises";
import { download } from "./util/download.ts";
import { exec } from "./util/exec.ts";
import { probe } from "./util/probe.ts";
import { runDownload } from "./util/runDownload.ts";

export async function node(target: string) {
  await mkdir(target, { recursive: true });

  // --- node ---
  // FROM: https://nodejs.org/en/download
  await download(
    "https://nodejs.org/dist/v24.22.0/node-v24.22.0-darwin-arm64.tar.gz",
    `${target}/node.tar.gz`,
  );
  await mkdir(`${target}/node`, { recursive: true });
  await exec("tar", [
    "xzf",
    `${target}/node.tar.gz`,
    "--strip-components=2",
    "-C",
    `${target}/node`,
    "node-v24.22.0-darwin-arm64/bin/node",
  ]);
  await rm(`${target}/node.tar.gz`);
  await probe("v24.22.0", `${target}/node/node`, ["--version"]);
}

runDownload(import.meta.url, node);
