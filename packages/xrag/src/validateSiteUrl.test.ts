import { expect, it } from "vitest";
import { validateSiteUrl } from "./validateSiteUrl.ts";

it.each([
  "https://box.example",
  "https://box.example:444/",
  "https://192.168.1.20",
])("normalizes trusted HTTPS origin %s", (value) => {
  expect(validateSiteUrl(value)).toBe(new URL(value).origin);
});
it.each([
  "https://box.example\nREALTIME_SERVER_SECRET=attacker",
  "https://box.example\rOTHER=value",
  "https://box.example/$foo",
  "https://user:secret@box.example",
  "https://box.example?x=1",
  "https://box.example#frag",
  "http://box.example",
  "file:///etc/passwd",
  "https://box.example`id`",
  "invalid",
])("rejects .env injection and non-origin site URL %s", (value) => {
  expect(() => validateSiteUrl(value)).toThrow();
});
