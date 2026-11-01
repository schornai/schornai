/* eslint-disable no-console */
import { mkdir, rm } from "node:fs/promises";
import { download } from "./util/download.ts";
import { exec } from "./util/exec.ts";
import { probeContains } from "./util/probeContains.ts";
import { runDownload } from "./util/runDownload.ts";

export async function ffmpeg(target: string) {
  await mkdir(target, { recursive: true });

  // --- ffmpeg ---
  // FROM: https://ffmpeg.martin-riedl.de/
  await mkdir(`${target}/ffmpeg`, { recursive: true });
  await download(
    "https://ffmpeg.martin-riedl.de/download/macos/arm64/1789931890_9.0.2/ffmpeg.zip",
    `${target}/ffmpeg.zip`,
  );
  await exec("unzip", [
    "-oq",
    `${target}/ffmpeg.zip`,
    "-d",
    `${target}/ffmpeg`,
  ]);
  await rm(`${target}/ffmpeg.zip`);
  await probeContains("ffmpeg version 9.0.2", `${target}/ffmpeg/ffmpeg`, [
    "-version",
  ]);
}

runDownload(import.meta.url, ffmpeg);
