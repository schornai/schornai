"use server";

import {
  attributeAvatarUrl,
  attributeFirstName,
  attributeGroups,
  attributeLastName,
} from "@/lib/defaultSAMLAttributes";
import type { SSOProviderAttributeMappingKeys } from "@schornio/aibox-package-database/sso/_types";
import { addSSOProvider as addSSOProviderDatabase } from "@schornio/aibox-package-database/sso/addSSOProvider";
import { revalidatePath } from "next/cache";
import { saveGetSupabaseServiceRoleConfig } from "@/lib/supabase/saveGetSupabaseServiceRoleConfig";
import { serverActionClient } from "@/lib/serverActionClient";
import { updateSSOProviderAttributeMappings } from "@schornio/aibox-package-database/sso/updateSSOProviderAttributeMappings";
import { z } from "zod/mini";

export const addSSOProvider = serverActionClient
  .inputSchema(
    z.object({
      metadataAsUrl: z.string(),
      metadataAsXML: z.string(),
    }),
  )
  .action(async ({ parsedInput: { metadataAsUrl, metadataAsXML } }) => {
    const supabaseServiceRoleConfig = await saveGetSupabaseServiceRoleConfig();

    if (metadataAsUrl.length > 0) {
      await addSSOProviderDatabase(
        { metadata_url: metadataAsUrl },
        { supabaseServiceRoleConfig },
      );
    } else if (metadataAsXML.length > 0) {
      await addSSOProviderDatabase(
        { metadata_xml: metadataAsXML },
        { supabaseServiceRoleConfig },
      );
    } else {
      throw new Error("INTERNAL_SERVER_ERROR");
    }

    const keys: SSOProviderAttributeMappingKeys = {};

    keys[attributeAvatarUrl.key] = {
      name: attributeAvatarUrl.defaultValue,
    };
    keys[attributeFirstName.key] = {
      name: attributeFirstName.defaultValue,
    };
    keys[attributeLastName.key] = {
      name: attributeLastName.defaultValue,
    };
    keys[attributeGroups.key] = {
      array: true,
      name: attributeGroups.defaultValue,
    };

    await updateSSOProviderAttributeMappings(
      { keys },
      { supabaseServiceRoleConfig },
    );

    revalidatePath("/");
  });
