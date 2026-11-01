import { defineConfig } from "eslint/config";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import { base } from "./base.ts";

export const react = defineConfig(
  ...base,
  reactHooksPlugin.configs.flat["recommended-latest"],
);
