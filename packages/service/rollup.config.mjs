import { builtinModules } from "node:module";
import { rm } from "node:fs/promises";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import ts from "typescript";

export default {
  input: {
    cli: "src/main.ts",
    commands: "src/cli.ts",
    bootstrap: "src/bootstrap.ts",
    installer: "src/installer.ts",
  },
  external: [
    ...builtinModules,
    ...builtinModules.map((name) => `node:${name}`),
  ],
  output: {
    dir: "dist",
    entryFileNames: "[name].mjs",
    chunkFileNames: "shared/[name]-[hash].mjs",
    format: "esm",
    banner: "#!/usr/bin/env node",
  },
  plugins: [
    {
      name: "clean-output",
      async buildStart() {
        await rm(new URL("./dist", import.meta.url), {
          recursive: true,
          force: true,
        });
      },
    },
    {
      name: "typescript",
      transform(code, id) {
        if (!/\.m?ts$/.test(id)) return null;
        return ts.transpileModule(code, {
          compilerOptions: {
            target: ts.ScriptTarget.ESNext,
            module: ts.ModuleKind.ESNext,
          },
          fileName: id,
        }).outputText;
      },
    },
    nodeResolve(),
    commonjs(),
    json(),
  ],
};
