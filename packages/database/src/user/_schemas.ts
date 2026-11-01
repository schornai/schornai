import z from "zod/v4";

export const roleNameSchema = z.union([z.literal("editor"), z.literal("user")]);

export const organizationRoleSchema = z.object({
  organization_id: z.string(),
  role: roleNameSchema,
});
