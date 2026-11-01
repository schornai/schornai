import { strict } from "@schornio/aibox-eslint-config/strict";

export default [
  ...strict,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
