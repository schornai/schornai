import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";

export default {
  external: ["@vercel/oidc"],
  input: {
    appRealtime: "apps/realtime/server.ts",
  },
  output: {
    dir: "apps/realtime/dist/rollup",
  },
  plugins: [
    typescript({
      tsconfig: "apps/realtime/tsconfig.json",
      module: "esnext",
      moduleResolution: "bundler",
      rewriteRelativeImportExtensions: true,
      incremental: false,
      noEmitOnError: true,
    }),
    nodeResolve({ moduleDirectories: ["packages"] }),
    terser(),
  ],
};
