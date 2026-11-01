import { z } from "zod/mini";

export const workspaceConfigSchema = z.object({
  description: z.string(),
  documentation: z.optional(z.string()),
  samlMappingWorkspaceAdmin: z.optional(z.string()),
  version: z.literal("workspace-config-v1"),
});
