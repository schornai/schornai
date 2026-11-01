import { cp, rm } from "node:fs/promises";

// The published CLI carries the independently built service runtime, so npx
// needs no private workspace package or source checkout on the target machine.
const destination = new URL("../dist", import.meta.url);
await rm(destination, { recursive: true, force: true });
await cp(
  new URL("../../../packages/service/dist", import.meta.url),
  new URL("service", destination.href + "/"),
  { recursive: true },
);

// npm packages need their own copy of the repository's license.
await cp(
  new URL("../../../LICENSE", import.meta.url),
  new URL("../LICENSE", import.meta.url),
);
