import { expect, it } from "vitest";
import { validateRepositoryFiles } from "../packages/database/src/xrag/validateRepositoryFiles.ts";
import { TEXT_WRITE_FILE_EXTENSION } from "../packages/database/src/storage/_utils/toStorageObjectArray.ts";
const manifest = (paths: string[]) =>
  paths.map((path) => ({ path, size: 3, contentType: "text/plain" }));
it.each(["../outside", "folder/../file", "control\u0001.txt", "dot/./file"])(
  "rejects unsafe manifest paths before import: %s",
  (path) => {
    expect(() => validateRepositoryFiles(manifest([path]))).toThrow();
  },
);
it("rejects normalization collisions and pending text writes", () => {
  expect(() =>
    validateRepositoryFiles(manifest(["Überblick.txt", "Uberblick.txt"])),
  ).toThrow("XRAG_DUPLICATE_FILE");
  expect(() =>
    validateRepositoryFiles(manifest([`file.txt${TEXT_WRITE_FILE_EXTENSION}`])),
  ).toThrow("XRAG_REPOSITORY_WRITE_PENDING");
  expect(() =>
    validateRepositoryFiles(manifest(["file.txt", "file.txt"])),
  ).toThrow("XRAG_DUPLICATE_FILE");
});
it("validates MIME types and sizes as part of the manifest", () => {
  expect(() =>
    validateRepositoryFiles([
      { path: "file", size: -1, contentType: "text/plain" },
    ]),
  ).toThrow();
  expect(() =>
    validateRepositoryFiles([
      { path: "file", size: 1, contentType: "text/plain\r\nInjected: header" },
    ]),
  ).toThrow();
});
