import type { Artifact } from "@schornio/aibox-package-database/xrag/_schema";
import type { MachineStatus } from "@schornio/aibox-realtime/documents/services/_schema";
export const serviceNow = Date.parse("2026-10-24T14:00:00Z");
export const serviceArtifacts: Artifact[] = [
  {
    id: "a".repeat(64),
    name: "schornai-setup-2026.10.xrag.tar",
    size: 5 * 1024 ** 3,
    createdAt: "2026-10-24T13:00:00Z",
    xrag: { xrag_version: 1, xrag_type: "setup" },
  },
  {
    id: "b".repeat(64),
    name: "whisper-large-v3.xrag.tar",
    size: 3 * 1024 ** 3,
    createdAt: "2026-10-23T12:00:00Z",
    xrag: {
      xrag_version: 1,
      xrag_type: "mlxWhisperModel",
      meta: { identifier: "whisper-large-v3", name: "Whisper Large v3" },
    },
    fileSystemIdentifier: "whisper-large-v3",
  },
  {
    id: "c".repeat(64),
    name: "dictionary.xrag.tar",
    size: 3 * 1024 ** 2,
    createdAt: "2026-10-22T12:00:00Z",
    xrag: {
      xrag_version: 1,
      xrag_type: "files",
      name: "dictionary",
      targets: ["transcriber-mlx"],
    },
  },
];
export const serviceMachines: MachineStatus[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Mac Studio",
    platform: "darwin/arm64",
    state: "running",
    roles: ["transcriber-mlx"],
    receivedAt: "2026-10-24T13:59:55Z",
    services: [{ name: "transcriber-mlx", state: "running" }],
    metrics: {
      cpuPercent: 32.4,
      memory: { used: 42 * 1024 ** 3, total: 64 * 1024 ** 3 },
      disk: { used: 480 * 1024 ** 3, total: 1024 ** 4 },
      gpus: [{ name: "Apple GPU", utilizationPercent: 74.2 }],
      uptimeSeconds: 86400,
    },
    sync: { state: "idle", lastSuccessAt: "2026-10-24T13:40:00Z" },
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Database Server",
    platform: "linux/x64",
    state: "running",
    roles: ["supabase"],
    receivedAt: "2026-10-24T13:50:00Z",
    services: [{ name: "supabase:db", state: "running", health: "healthy" }],
    metrics: {
      cpuPercent: 8.1,
      memory: { used: 6 * 1024 ** 3, total: 16 * 1024 ** 3 },
      disk: { used: 250 * 1024 ** 3, total: 1024 ** 4 },
      gpus: [],
      uptimeSeconds: 86400,
    },
    sync: { state: "idle" },
  },
];
