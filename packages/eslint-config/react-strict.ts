import { defineConfig } from "eslint/config";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import { strict } from "./strict.ts";

export const reactStrict = defineConfig(
  ...strict,
  reactHooksPlugin.configs.flat["recommended-latest"],
);
