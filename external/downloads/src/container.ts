/* eslint-disable no-console */
import { chmod, mkdir, rm } from "node:fs/promises";
import { download } from "./util/download.ts";
import { exec } from "./util/exec.ts";
import { probe } from "./util/probe.ts";
import { probeContains } from "./util/probeContains.ts";
import { runDownload } from "./util/runDownload.ts";

export async function container(target: string) {
  await mkdir(target, { recursive: true });

  // --- colima ---
  // FROM: https://github.com/abiosoft/colima/releases
  await mkdir(`${target}/colima`, { recursive: true });
  await download(
    "https://github.com/abiosoft/colima/releases/download/v0.10.3/colima-Darwin-arm64",
    `${target}/colima/colima`,
  );
  await chmod(`${target}/colima/colima`, 0o755);
  await probe("colima version v0.10.3", `${target}/colima/colima`, [
    "--version",
  ]);

  // --- lima ---
  // FROM: https://github.com/lima-vm/lima/releases
  await download(
    "https://github.com/lima-vm/lima/releases/download/v2.2.1/lima-2.2.1-Darwin-arm64.tar.gz",
    `${target}/lima.tar.gz`,
  );
  await mkdir(`${target}/lima`, { recursive: true });
  await exec("tar", ["xzf", `${target}/lima.tar.gz`, "-C", `${target}/lima`]);
  await rm(`${target}/lima.tar.gz`);
  await probe("limactl version 2.2.1", `${target}/lima/bin/limactl`, [
    "--version",
  ]);

  // --- docker ---
  // FROM https://download.docker.com/mac/static/stable/aarch64/
  await download(
    "https://download.docker.com/mac/static/stable/aarch64/docker-29.9.1.tgz",
    `${target}/docker.tgz`,
  );
  await mkdir(`${target}/docker`, { recursive: true });
  await exec("tar", ["xzf", `${target}/docker.tgz`, "-C", target]);
  await rm(`${target}/docker.tgz`);
  await probeContains("Docker version 29.9.1", `${target}/docker/docker`, [
    "--version",
  ]);

  // --- docker-compose ---
  // FROM https://github.com/docker/compose/releases
  await mkdir(`${target}/docker`, { recursive: true });
  await download(
    "https://github.com/docker/compose/releases/download/v5.6.0/docker-compose-darwin-aarch64",
    `${target}/docker/docker-compose`,
  );
  await chmod(`${target}/docker/docker-compose`, 0o755);
  await probe(
    "Docker Compose version v5.6.0",
    `${target}/docker/docker-compose`,
    ["--version"],
  );
}

runDownload(import.meta.url, container);
