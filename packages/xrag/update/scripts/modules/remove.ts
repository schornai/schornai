import { access, rm } from "node:fs/promises";

export async function remove(path: string) {
  try {
    await access(path);
  } catch {
    console.log(`NOTHING TO REMOVE "${path}"`);
    return;
  }

  await rm(path, { recursive: true });
  console.log(`REMOVE "${path}"`);
}
