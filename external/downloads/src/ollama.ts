/* eslint-disable no-console */
import { mkdir, rm } from "node:fs/promises";
import { download } from "./util/download.ts";
import { exec } from "./util/exec.ts";
import { probeContains } from "./util/probeContains.ts";
import { runDownload } from "./util/runDownload.ts";

export async function ollama(target: string) {
  await mkdir(target, { recursive: true });

  // --- ollama ---
  // FROM https://github.com/ollama/ollama/releases
  await mkdir(`${target}/ollama`, { recursive: true });
  await download(
    "https://github.com/ollama/ollama/releases/download/v0.40.6/ollama-darwin.tgz",
    `${target}/ollama.tgz`,
  );
  await exec("tar", ["xzf", `${target}/ollama.tgz`, "-C", `${target}/ollama`]);
  await rm(`${target}/ollama.tgz`);
  // --version otherwise reports the running server's version as well. Port 0
  // prevents a local/remote server or inherited OLLAMA_HOST from influencing it.
  await probeContains(
    "client version is 0.40.6",
    `${target}/ollama/ollama`,
    ["--version"],
    {
      ...process.env,
      OLLAMA_HOST: "http://127.0.0.1:0",
    },
  );
}

runDownload(import.meta.url, ollama);
