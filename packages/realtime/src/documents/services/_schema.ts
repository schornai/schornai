import { z } from "zod";
import type { Doc } from "yjs";
import type { DocumentName } from "../../_lib/DocumentName.ts";

export const servicesDocumentName = "services" as DocumentName;
export const machineStateSchema = z.enum([
  "starting",
  "running",
  "updating",
  "stopping",
  "stopped",
]);
export const serviceStatusSchema = z.object({
  name: z.string().min(1).max(128),
  state: z.enum([
    "starting",
    "running",
    "restarting",
    "stopped",
    "error",
    "unknown",
  ]),
  health: z.enum(["healthy", "unhealthy", "starting"]).optional(),
});
const bytes = z.number().finite().nonnegative();
const capacity = z.object({ used: bytes, total: bytes });
const percentage = z.number().min(0).max(100).nullable();
export const machineReportSchema = z.object({
  name: z.string().min(1).max(255),
  platform: z.string().max(64),
  state: machineStateSchema,
  roles: z.array(z.string().max(64)).max(32),
  services: z.array(serviceStatusSchema).max(100),
  metrics: z.object({
    cpuPercent: percentage,
    memory: capacity,
    disk: capacity.nullable(),
    gpus: z
      .array(
        z.object({ name: z.string().max(255), utilizationPercent: percentage }),
      )
      .max(32),
    uptimeSeconds: bytes.nullable(),
  }),
  sync: z.object({
    state: z.enum(["idle", "syncing", "error", "disabled"]),
    lastSuccessAt: z.iso.datetime().optional(),
  }),
});
export type MachineReport = z.infer<typeof machineReportSchema>;
export type ServiceStatus = z.infer<typeof serviceStatusSchema>;
export type MachineStatus = MachineReport & { id: string; receivedAt: string };
export const getMachines = (document: Doc) =>
  document.getMap<MachineStatus>("machines");
export const machineOfflineAfterMs = 35_000;
