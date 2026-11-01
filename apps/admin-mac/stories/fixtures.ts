import type { ChildProcessMessage } from "../src/types";

export const messages: ChildProcessMessage[] = [
  {
    sender: "transcriber-mlx",
    level: "stderr",
    timestampISO: "2026-01-15T11:59:59.000Z",
    message:
      "Model not found: whisper-large-v3\nWaiting for a matching artifact.",
  },
  {
    sender: "web",
    level: "stdout",
    timestampISO: "2026-01-15T11:59:58.000Z",
    message: "Ready on https://localhost:3000",
  },
  {
    sender: "service",
    level: "stdout",
    timestampISO: "2026-01-15T11:59:57.000Z",
    message: "Service started. Services: core, transcriber-mlx.",
  },
  {
    level: "stdout",
    timestampISO: "2026-01-15T11:59:56.000Z",
    message: "Connecting to service…",
  },
];
