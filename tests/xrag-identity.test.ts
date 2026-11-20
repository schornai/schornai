import { expect, it } from "vitest";
import { z } from "zod";
import {
  importedResourceId,
  nativeResourceId,
} from "../packages/xrag/src/identity.ts";

it("resolves delayed references deterministically within the selected workspace", () => {
  const origin = nativeResourceId("documentRepository", "legacy-custom-id");
  const mountBeforeImport = importedResourceId(
    "workspace",
    "documentRepository",
    origin,
  );
  const repositoryOnLaterImport = importedResourceId(
    "workspace",
    "documentRepository",
    origin,
  );
  expect(mountBeforeImport).toBe(repositoryOnLaterImport);
  expect(z.uuid().safeParse(origin).success).toBe(true);
  expect(z.uuid().safeParse(repositoryOnLaterImport).success).toBe(true);
  expect(importedResourceId("other", "documentRepository", origin)).not.toBe(
    repositoryOnLaterImport,
  );
  expect(nativeResourceId("agent", "legacy-custom-id")).not.toBe(origin);
});

it("does not conflate identities whose fields contain separators", () => {
  expect(importedResourceId("a:b", "agent", "c")).not.toBe(
    importedResourceId("a", "agent", "b:c"),
  );
  expect(() => nativeResourceId("agent", "")).toThrow("INVALID_IDENTITY");
  expect(() => importedResourceId("", "agent", "id")).toThrow(
    "INVALID_IDENTITY",
  );
  expect(() => importedResourceId("workspace", "agent", "")).toThrow(
    "INVALID_IDENTITY",
  );
});
