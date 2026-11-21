import { z } from "zod";
import { appColorSchema, appIconSchema } from "../_shared/_schema.ts";
import { storageSchema } from "../storage/_schemas.ts";
import { validateStoragePath } from "../storage/validatePath.ts";

const timezone = z
  .string()
  .min(1)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  });
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const automationScheduleSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("hours"),
    every: z.number().int().min(1).max(8760),
  }),
  z.object({
    kind: z.literal("days"),
    every: z.number().int().min(1).max(365),
  }),
  z.object({
    kind: z.literal("weekly"),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    time,
    timezone,
  }),
  z.object({
    kind: z.literal("monthly"),
    day: z.number().int().min(1).max(31),
    time,
    timezone,
  }),
  z.object({ kind: z.literal("once"), at: z.iso.datetime({ offset: true }) }),
]);
export const automationTriggerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("time"), schedule: automationScheduleSchema }),
  z.object({
    type: z.literal("storage"),
    storage: storageSchema,
    events: z
      .array(z.enum(["uploaded", "processed", "deleted", "updated", "moved"]))
      .min(1)
      .max(5),
    folder: z.string().transform((path, ctx) => {
      try {
        return validateStoragePath(path, { allowRoot: true });
      } catch {
        ctx.addIssue({ code: "custom", message: "INVALID_FILE_PATH" });
        return z.NEVER;
      }
    }),
    includeSubfolders: z.boolean(),
    attachment: z.enum(["none", "copy", "reference"]),
  }),
]);
export const automationInputSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1).max(200),
  description: z.string().max(10000).optional(),
  color: z.optional(appColorSchema),
  icon: z.optional(appIconSchema),
  agentId: z.string().min(1),
  message: z.string().trim().min(1).max(100_000),
  enabled: z.boolean(),
  trigger: automationTriggerSchema,
});
export type AutomationInput = z.infer<typeof automationInputSchema>;
export type AutomationSchedule = z.infer<typeof automationScheduleSchema>;
export type AutomationTrigger = z.infer<typeof automationTriggerSchema>;

export const automationRunInputSchema = z.object({
  id: z.uuid(),
  requestId: z.uuid(),
  path: z.string().optional(),
});
