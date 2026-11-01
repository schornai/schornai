import { defineConfig } from "eslint/config";
import { base } from "./base.ts";

export const strict = defineConfig(...base, {
  rules: {
    "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    "@typescript-eslint/consistent-type-imports": "error",
    "no-console": "warn",
    "sort-imports": "error",
    "sort-keys": "error",
  },
});
