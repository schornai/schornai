import {
  composeAccessMessage,
  parseAccessMessageTemplates,
} from "@schornio/aibox-database/config/accessMessage";
import { createSSOSettings } from "@schornio/aibox-database/sso/createSSOSettings";
import { saveSSOAttributeMapping } from "@schornio/aibox-database/sso/saveSSOAttributeMapping";
import { samlMappingSchema } from "@schornio/aibox-database/sso/_schemas";
import { ssoProviderInputSchema } from "@schornio/aibox-database/sso/_schemas";
import { z } from "zod";
import type { PlatformContext, platformRegistry } from "./registry.ts";
import { themeEditorSettingsSchema } from "@schornio/aibox-database/config/themeEditorSettings";
import { saveThemeSettings } from "@schornio/aibox-database/config/saveThemeSettings";
import { getSystemConfig } from "@schornio/aibox-database/config/getSystemConfig";
import { getSSOProvider } from "@schornio/aibox-database/sso/getSSOProvider";
import { deleteSSOProvider } from "@schornio/aibox-database/sso/deleteSSOProvider";
import { getSAMLMetadata } from "@schornio/aibox-database/sso/getSAMLMetadata";
import { createUserWithResetKey } from "@schornio/aibox-database/user/createUserWithResetKey";
import { reissuePasswordResetKey } from "@schornio/aibox-database/user/reissuePasswordResetKey";
import { getExternalAIModelConnection } from "@schornio/aibox-database/aiModel/getExternalAIModelConnection";
import { externalModelInputSchema } from "@schornio/aibox-database/aiModel/externalModelInputSchema";
import { listExternalModels } from "../models/listExternalModels.ts";
import { ArtifactCatalogSession } from "../documents/artifactCatalog/ArtifactCatalogSession.ts";

export function addSettingsTools(
  context: PlatformContext,
  { add }: ReturnType<typeof platformRegistry>,
) {
  const options = { supabase: context.supabaseServiceRole };
  const sso = () => {
    if (!context.getSsoConfig) throw new Error("SSO_NOT_CONFIGURED");
    return { supabaseServiceRoleConfig: context.getSsoConfig() };
  };
  add(
    "platform_theme_get",
    "Read saved theme, welcome messages and account invitation templates. Missing values use application defaults.",
    "admin",
    true,
    z.object({}),
    async () =>
      Object.fromEntries(
        await Promise.all(
          ["theme", "welcomeMessage", "accessMessage"].map(async (key) => [
            key,
            await getSystemConfig(
              key as "theme" | "welcomeMessage" | "accessMessage",
              options,
            ),
          ]),
        ),
      ),
  );
  add(
    "platform_theme_update",
    "Save theme colors/logos, localized welcome messages and account invitation templates atomically. Replaces these settings; read existing settings first.",
    "admin",
    false,
    themeEditorSettingsSchema,
    async (input) => {
      await saveThemeSettings(input, options);
      return { saved: true };
    },
  );
  add(
    "platform_sso_get",
    "Read the configured SAML identity provider and attribute mappings. The application supports one provider.",
    "admin",
    true,
    z.object({}),
    () => getSSOProvider(sso()),
  );
  add(
    "platform_sso_create",
    "Register the SAML identity provider using metadata URL or XML and apply the application's default attribute mappings.",
    "admin",
    false,
    ssoProviderInputSchema,
    async (input) => {
      await createSSOSettings(input, sso());
      return { saved: true };
    },
  );
  add(
    "platform_sso_delete",
    "Remove the configured SAML identity provider. This affects SSO sign-in.",
    "admin",
    false,
    z.object({}),
    async () => {
      await deleteSSOProvider(sso());
      return { deleted: true };
    },
  );
  add(
    "platform_sso_mapping_update",
    "Update trusted SAML attribute mappings. Empty values restore the defaults.",
    "admin",
    false,
    samlMappingSchema,
    async (input) => {
      await saveSSOAttributeMapping(input, sso());
      return { saved: true };
    },
  );
  add(
    "platform_sso_metadata",
    "Download the application's SAML service-provider metadata as XML.",
    "admin",
    true,
    z.object({}),
    () => getSAMLMetadata(sso()),
  );
  add(
    "platform_user_create",
    "Create an email account and issue a one-time password setup key. The result contains a sensitive key; deliver it privately to the account owner. Use platform_user_access_message to compose the configured invitation email.",
    "admin",
    false,
    z.object({
      email: z.email(),
      firstName: z.string().trim().max(200).optional(),
      lastName: z.string().trim().max(200).optional(),
    }),
    (input) =>
      createUserWithResetKey(input, {
        supabaseServiceRole: context.supabaseServiceRole,
      }),
  );
  add(
    "platform_user_access_message",
    "Compose an account invitation email using the saved localized template and application defaults. Supply the key and expiry returned by user_create or user_reset_key, and the public schornai application URL. Returns subject, body and resetUrl; does not send email or issue a new key. Sensitive output.",
    "admin",
    true,
    z.object({
      email: z.email(),
      firstName: z.string().max(200).optional(),
      lastName: z.string().max(200).optional(),
      resetKey: z.string().min(1),
      expires: z.iso.datetime({ offset: true }),
      applicationUrl: z.url(),
      language: z.string().min(1).default("de"),
      timeZone: z.string().min(1).default("UTC"),
    }),
    async (input) =>
      composeAccessMessage({
        ...input,
        templates: parseAccessMessageTemplates(
          await getSystemConfig("accessMessage", options),
        ),
      }),
  );
  add(
    "platform_user_reset_key",
    "Replace a user's password reset key. Returns a sensitive, expiring, single-use key; existing keys are invalidated.",
    "admin",
    false,
    z.object({ userId: z.uuid() }),
    ({ userId }) =>
      reissuePasswordResetKey(userId, {
        supabaseServiceRole: context.supabaseServiceRole,
      }),
  );
  add(
    "platform_models_discover",
    "Discover provider models using a saved connection ID or explicitly supplied connection settings. Saved secrets are only sent to their stored endpoint.",
    "admin",
    true,
    z.object({
      connection: z.union([
        z.object({ id: z.string().min(1) }).strict(),
        externalModelInputSchema,
      ]),
    }),
    async ({ connection: input }) => {
      if ("id" in input) {
        const { config, apiKey } = await getExternalAIModelConnection(
          { id: input.id },
          options,
        );
        return listExternalModels({ ...config, apiKey });
      }
      return listExternalModels(input);
    },
  );
  add(
    "platform_artifact_delete",
    "Delete a published artifact and its catalog entry using the same cleanup as the artifact administration UI.",
    "admin",
    false,
    z.object({ id: z.string().min(1) }),
    async ({ id }) => {
      await using session = new ArtifactCatalogSession({
        serverToken: context.serverToken,
        websocketProvider: context.websocketProvider,
      });
      await session.remove(id, options);
      return { id };
    },
  );
}
