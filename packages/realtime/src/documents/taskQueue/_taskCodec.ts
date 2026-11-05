import { Buffer } from "node:buffer";
import { Doc, applyUpdate, encodeStateAsUpdate } from "yjs";

// Reuse the queue's Yjs value format, including binary model inputs/results.
// Plain JSON would turn Uint8Array values into objects during claim recovery.
export function encodeTaskValue(value: unknown): string {
  const document = new Doc();
  try {
    document.getArray("value").push([value]);
    return Buffer.from(encodeStateAsUpdate(document)).toString("base64");
  } finally {
    document.destroy();
  }
}
export function decodeTaskValue<T>(value: string): T {
  const document = new Doc();
  try {
    applyUpdate(document, Buffer.from(value, "base64"));
    return document.getArray<T>("value").get(0);
  } finally {
    document.destroy();
  }
}
