import { z } from "zod/v4-mini";

export const roleNameSchema = z.union([
  z.literal("workspace-admin"),
  z.literal("editor"),
  z.literal("user"),
]);

export const organizationRoleSchema = z.object({
  organization_id: z.string(),
  role: roleNameSchema,
});

export const userClaimsSchema = z.union([
  z.literal("admin"),
  z.array(organizationRoleSchema),
]);
