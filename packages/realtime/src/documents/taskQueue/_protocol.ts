import { z } from "zod/mini";
export const taskCoordinatorProtocol = "task-coordinator-v1";
const id = z.string().check(z.minLength(1), z.maxLength(256));
const owner = { taskId: id, token: z.uuid() };
export const taskCoordinatorRequestSchema = z.intersection(
  z.object({
    protocol: z.literal(taskCoordinatorProtocol),
    requestId: z.uuid(),
  }),
  z.union([
    z.object({
      action: z.literal("claim"),
      type: z.enum([
        "chat",
        "agent-select-role",
        "model-do-generate",
        "model-do-stream",
        "model-do-embed",
        "process-file",
        "transcribe",
      ]),
      worker: id,
      capabilities: z.array(id),
    }),
    z.object({ action: z.literal("renew"), ...owner }),
    z.object({
      action: z.literal("finish"),
      ...owner,
      result: z.optional(z.string()),
      error: z.optional(z.string()),
    }),
  ]),
);
export type TaskCoordinatorRequest = z.infer<
  typeof taskCoordinatorRequestSchema
>;
type WithoutEnvelope<T> = T extends unknown
  ? Omit<T, "requestId" | "protocol">
  : never;
export type TaskCoordinatorCommand = WithoutEnvelope<TaskCoordinatorRequest>;
export const taskCoordinatorResponseSchema = z.object({
  protocol: z.literal(taskCoordinatorProtocol),
  requestId: z.uuid(),
  ok: z.boolean(),
  task: z.optional(z.string()),
  accepted: z.optional(z.boolean()),
});
