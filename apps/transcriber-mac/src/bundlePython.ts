import { mkdir } from "node:fs/promises";
import { once } from "node:events";
import { spawn } from "node:child_process";

async function bundlePythonInterface() {
  await mkdir("./dist/.buildArtifacts", { recursive: true });

  const hiddenImports = [
    "mlx.core",
    "mlx.metal",
    "mlx._reprlib_fix",
    "mlx_whisper",
    "mlx_whisper.audio",
    "numpy.lib.npyio",
    "zipfile",
    "tiktoken",
    "tiktoken_ext",
    "tiktoken_ext.openai_public",
  ];

  const datas = [
    `${process.cwd()}/venv/lib/python3.13/site-packages/mlx:mlx`,
    `${process.cwd()}/venv/lib/python3.13/site-packages/mlx_whisper:mlx_whisper`,
  ];

  const pyinstallerProcess = spawn(
    `${process.cwd()}/venv/bin/pyinstaller`,
    [
      // SciPy loads its NumPy compatibility backends dynamically.
      "--collect-submodules",
      "scipy._external.array_api_compat",
      ...hiddenImports.flatMap((hiddenImport) => [
        "--hidden-import",
        hiddenImport,
      ]),
      ...datas.flatMap((data) => ["--add-data", data]),
      "--distpath",
      `${process.cwd()}/dist`,
      "--onedir",
      "--name",
      "transcribe-worker",
      "--noconfirm",
      `${process.cwd()}/src/core/transcribe.py`,
    ],
    { cwd: "./dist/.buildArtifacts" },
  );

  pyinstallerProcess.stdout.pipe(process.stdout);
  pyinstallerProcess.stderr.pipe(process.stderr);

  const [code] = (await once(pyinstallerProcess, "close")) as [number];

  if (code !== 0) {
    throw new Error(
      `Command "${pyinstallerProcess.spawnargs.join(" ")}" failed with error code ${code}`,
    );
  }
}

bundlePythonInterface().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
