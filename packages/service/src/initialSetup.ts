import { execFile } from "node:child_process";
import {
  chmod,
  mkdir,
  mkdtemp,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { initConfig, loadConfig, resolveFrom } from "./config.ts";
import { writeJson } from "./files.ts";
import { generateDockerEnv } from "../../xrag/update/scripts/generateDockerEnv.ts";

const execute = promisify(execFile);

export async function fileExists(path: string) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return false;
  }
}

export function initialServices(platform: string, arch: string) {
  if (
    !(platform === "darwin" && arch === "arm64") &&
    !(platform === "linux" && ["arm64", "x64"].includes(arch))
  )
    throw new Error(`No schorn.ai setup is supported for ${platform}/${arch}`);
  return [
    "core",
    "supabase",
    "document-extractor",
    ...(platform === "darwin" ? ["ollama", "transcriber-mlx"] : []),
  ];
}

/** Only for a new local instance owned by the bootstrap, never remote workers. */
export async function prepareInitialSetup(
  configPath: string,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  if (!(await fileExists(configPath))) {
    const config = await initConfig(
      configPath,
      initialServices(process.platform, process.arch),
    );
    await writeJson(configPath, {
      ...config,
      sharing: { url: "http://127.0.0.1:3001" },
    });
  }
  const { config, root } = await loadConfig(configPath);
  const envPath = resolveFrom(root, config.envFile);
  if (!(await fileExists(envPath))) {
    const { stdout } = await execute(
      "openssl",
      ["genpkey", "-algorithm", "rsa", "-outform", "DER"],
      { encoding: "buffer", signal },
    );
    await mkdir(dirname(envPath), { recursive: true, mode: 0o700 });
    await writeFile(
      envPath,
      generateDockerEnv({
        boxId: config.id,
        samlPrivateKey: stdout.toString("base64"),
        siteUrl: "https://localhost",
      }),
      { flag: "wx", mode: 0o600 },
    );
  }
  const cert = join(root, "docker/volumes/api/cert");
  const key = join(cert, "privkey.pem");
  const certificate = join(cert, "fullkey.pem");
  const hasKey = await fileExists(key);
  const hasCertificate = await fileExists(certificate);
  if (hasKey !== hasCertificate)
    throw new Error(
      `Incomplete TLS certificate pair in ${cert}; restore the matching pair before retrying`,
    );
  if (hasKey) return;
  // Generate outside the destination so an OpenSSL failure leaves no partial pair.
  await mkdir(dirname(cert), { recursive: true, mode: 0o700 });
  const stagedCert = await mkdtemp(join(dirname(cert), ".cert-"));
  try {
    const stagedKey = join(stagedCert, "privkey.pem");
    await execute(
      "openssl",
      [
        "req",
        "-x509",
        "-nodes",
        "-newkey",
        "rsa:2048",
        "-keyout",
        stagedKey,
        "-out",
        join(stagedCert, "fullkey.pem"),
        "-days",
        "365",
        "-subj",
        "/CN=localhost",
        "-addext",
        "subjectAltName=DNS:localhost,IP:127.0.0.1",
      ],
      { signal },
    );
    await chmod(stagedKey, 0o600);
    signal?.throwIfAborted();
    await rename(stagedCert, cert);
  } finally {
    await rm(stagedCert, { recursive: true, force: true });
  }
}
