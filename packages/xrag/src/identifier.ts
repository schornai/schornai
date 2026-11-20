import { z } from "zod";

/** Portable, human-readable identity; local database IDs remain independent. */
export const globalIdentifierSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9/_-]+$/);

export function identifierFromTitle(title: string) {
  return (
    title
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 180)
      .replace(/-+$/g, "") || "object"
  );
}

/** Identifiers may contain slashes; archive download names must be basenames. */
export function identifierFileName(identifier: string) {
  return globalIdentifierSchema.parse(identifier).replaceAll("/", "-");
}
