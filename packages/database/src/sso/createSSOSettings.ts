import type { z } from "zod";
import type { ServiceRoleConfig } from "./_types.ts";
import { ssoProviderInputSchema } from "./_schemas.ts";
import { addSSOProvider } from "./addSSOProvider.ts";
import { saveSSOAttributeMapping } from "./saveSSOAttributeMapping.ts";
/** Caller must authorize a global administrator. */
export async function createSSOSettings(
  input: z.input<typeof ssoProviderInputSchema>,
  options: { supabaseServiceRoleConfig: ServiceRoleConfig },
) {
  const p = ssoProviderInputSchema.parse(input);
  await addSSOProvider(
    p.metadataAsUrl
      ? { metadata_url: p.metadataAsUrl }
      : { metadata_xml: p.metadataAsXML },
    options,
  );
  await saveSSOAttributeMapping({}, options);
}
