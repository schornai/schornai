import { cp } from "node:fs/promises";

export async function copy(...params: Parameters<typeof cp>) {
  const [from, to, options] = params;
  await cp(from, to, {
    ...options,
    // https://github.com/nodejs/node/issues/41693
    // Set the default from false to true
    // so symlinks get resolved relativly
    // e.g. electron.js works with symlinks
    verbatimSymlinks:
      typeof options?.verbatimSymlinks === "boolean"
        ? options.verbatimSymlinks
        : true,
  });
  console.log(`COPY FROM "${from}" TO "${to}"`);
}
