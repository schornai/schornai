import type { z } from "zod";
import type { ServiceRoleConfig } from "./_types.ts";
import { samlMappingSchema } from "./_schemas.ts";
import { updateSSOProviderAttributeMappings } from "./updateSSOProviderAttributeMappings.ts";
import {
  attributeAvatarUrl,
  attributeFirstName,
  attributeLastName,
  attributeGroups,
} from "./defaultSAMLAttributes.ts";
/** Caller must authorize a global administrator. */
export async function saveSSOAttributeMapping(
  input: z.infer<typeof samlMappingSchema>,
  options: { supabaseServiceRoleConfig: ServiceRoleConfig },
) {
  const p = samlMappingSchema.parse(input);
  await updateSSOProviderAttributeMappings(
    {
      keys: {
        [attributeAvatarUrl.key]: {
          name:
            p.samlMappingAttributeAvatarUrl || attributeAvatarUrl.defaultValue,
        },
        [attributeFirstName.key]: {
          name:
            p.samlMappingAttributeFirstName || attributeFirstName.defaultValue,
        },
        [attributeLastName.key]: {
          name:
            p.samlMappingAttributeLastName || attributeLastName.defaultValue,
        },
        [attributeGroups.key]: {
          name:
            p.samlMappingAttributePermissionGroups ||
            attributeGroups.defaultValue,
          array: true,
        },
      },
    },
    options,
  );
}
