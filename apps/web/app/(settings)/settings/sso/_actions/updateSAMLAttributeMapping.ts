"use server";

import {
  attributeAvatarUrl,
  attributeFirstName,
  attributeGroups,
  attributeLastName,
} from "@/lib/defaultSAMLAttributes";
import type { SSOProviderAttributeMappingKeys } from "@schornio/aibox-package-database/sso/_types";
import { revalidatePath } from "next/cache";
import { saveGetSupabaseServiceRoleConfig } from "@/lib/supabase/saveGetSupabaseServiceRoleConfig";
import { serverActionClient } from "@/lib/serverActionClient";
import { updateSSOProviderAttributeMappings } from "@schornio/aibox-package-database/sso/updateSSOProviderAttributeMappings";
import { z } from "zod/mini";

const transformEmptyStringToUndefined = z.transform<string | undefined>(
  (value) => ((value?.length ?? 0) === 0 ? undefined : value),
);

const sanitizedString = z.pipe(
  z.optional(z.string().check(z.trim())),
  transformEmptyStringToUndefined,
);

// const sanitizedString = z.string();

export const updateSAMLAttributeMapping = serverActionClient
  .inputSchema(
    z.object({
      samlMappingAttributeAvatarUrl: sanitizedString,
      samlMappingAttributeFirstName: sanitizedString,
      samlMappingAttributeLastName: sanitizedString,
      samlMappingAttributePermissionGroups: sanitizedString,
    }),
  )
  .action(
    async ({
      parsedInput: {
        samlMappingAttributeAvatarUrl,
        samlMappingAttributeFirstName,
        samlMappingAttributeLastName,
        samlMappingAttributePermissionGroups,
      },
    }) => {
      const supabaseServiceRoleConfig =
        await saveGetSupabaseServiceRoleConfig();

      const keys: SSOProviderAttributeMappingKeys = {};

      keys[attributeAvatarUrl.key] = {
        name: samlMappingAttributeAvatarUrl ?? attributeAvatarUrl.defaultValue,
      };
      keys[attributeFirstName.key] = {
        name: samlMappingAttributeFirstName ?? attributeFirstName.defaultValue,
      };
      keys[attributeLastName.key] = {
        name: samlMappingAttributeLastName ?? attributeLastName.defaultValue,
      };
      keys[attributeGroups.key] = {
        array: true,
        name:
          samlMappingAttributePermissionGroups ?? attributeGroups.defaultValue,
      };

      await updateSSOProviderAttributeMappings(
        { keys },
        { supabaseServiceRoleConfig },
      );

      revalidatePath("/");
    },
  );
