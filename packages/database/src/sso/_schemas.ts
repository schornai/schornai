import { z } from "zod";
export const samlMappingSchema = z.object({
  samlMappingAttributeAvatarUrl: z.string().trim().max(500).optional(),
  samlMappingAttributeFirstName: z.string().trim().max(500).optional(),
  samlMappingAttributeLastName: z.string().trim().max(500).optional(),
  samlMappingAttributePermissionGroups: z.string().trim().max(500).optional(),
});
export const ssoProviderInputSchema = z
  .object({
    metadataAsUrl: z.string().max(2048).default(""),
    metadataAsXML: z.string().max(1048576).default(""),
  })
  .refine((x) => !!x.metadataAsUrl || !!x.metadataAsXML);
