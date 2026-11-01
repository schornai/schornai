import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

export default {
  input: {
    appTranscriberMac: "apps/transcriber-mac/server.ts",
  },
  output: {
    dir: "apps/transcriber-mac/dist/rollup",
  },
  plugins: [
    typescript({
      tsconfig: "apps/transcriber-mac/tsconfig.json",
      module: "esnext",
      moduleResolution: "bundler",
      rewriteRelativeImportExtensions: true,
      incremental: false,
      noEmitOnError: true,
    }),
    nodeResolve({ moduleDirectories: ["node_modules", "packages"] }),
    commonjs(),
    json(),
    terser(),
  ],
};
