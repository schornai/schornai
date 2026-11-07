import { uploadAsset } from "@schornio/aibox-database/storage/uploadAsset";
import { redeemPasswordResetKey } from "@schornio/aibox-database/user/redeemPasswordResetKey";
import { preferencesSchema } from "@schornio/aibox-database/config/viewPreferences";
import { z } from "zod";
import type { PlatformContext, platformRegistry } from "./registry.ts";
import { requirePlatformAccess } from "@schornio/aibox-database/mcp/platformAccess";
import { getUserById } from "@schornio/aibox-database/user/getUserById";
import { updateUserProfileName } from "@schornio/aibox-database/user/updateUserProfileName";
import { saveUserAvatar } from "@schornio/aibox-database/user/saveUserAvatar";
import { settingFavoritesSchema } from "@schornio/aibox-database/config/favoritesSchema";
import { getCurrentUserConfig } from "@schornio/aibox-database/config/getCurrentUserConfig";
import { setUserConfig } from "@schornio/aibox-database/config/setUserConfig";
import { listMCPOAuthConnections } from "@schornio/aibox-database/mcp/listMCPOAuthConnections";
import { deleteMCPOAuthConnection } from "@schornio/aibox-database/mcp/deleteMCPOAuthConnection";
import { createAssetUpload } from "@schornio/aibox-database/storage/createAssetUpload";
export function addProfileTools(
  context: PlatformContext,
  { add }: ReturnType<typeof platformRegistry>,
) {
  const admin = { supabaseServiceRole: context.supabaseServiceRole };
  add(
    "platform_profile_get",
    "Read your profile, avatar and account sign-in method.",
    "user",
    true,
    z.object({}),
    () => getUserById(context.userId, admin),
  );
  add(
    "platform_profile_name_update",
    "Update your own profile name.",
    "user",
    false,
    z.object({ firstName: z.string().max(200), lastName: z.string().max(200) }),
    async (input) => {
      await updateUserProfileName(context.userId, input, admin);
      return { userId: context.userId };
    },
  );
  add(
    "platform_profile_avatar_update",
    "Set your own uploaded avatar or remove the override. Upload to your user_avatars folder first; null restores the SSO/default avatar.",
    "user",
    false,
    z.object({ avatarPath: z.string().nullable() }),
    async ({ avatarPath }) => {
      if (
        avatarPath &&
        (!avatarPath.startsWith(`user_avatars/${context.userId}/`) ||
          avatarPath.includes(".."))
      )
        throw new Error("INVALID_AVATAR_PATH");
      await saveUserAvatar(context.userId, avatarPath ?? undefined, admin);
      return { saved: true };
    },
  );
  add(
    "platform_user_avatar_update",
    "Set or remove another user's avatar. Path must belong to that user.",
    "admin",
    false,
    z.object({ userId: z.uuid(), avatarPath: z.string().nullable() }),
    async ({ userId, avatarPath }) => {
      if (
        avatarPath &&
        (!avatarPath.startsWith(`user_avatars/${userId}/`) ||
          avatarPath.includes(".."))
      )
        throw new Error("INVALID_AVATAR_PATH");
      await saveUserAvatar(userId, avatarPath ?? undefined, admin);
      return { userId };
    },
  );
  add(
    "platform_favorites_get",
    "Read your saved favorites and sidebar visibility.",
    "user",
    true,
    z.object({}),
    () => getCurrentUserConfig("favorites", { supabase: context.supabase }),
  );
  add(
    "platform_favorites_update",
    "Replace your favorites and sidebar visibility. Does not grant access to the referenced resources.",
    "user",
    false,
    settingFavoritesSchema,
    async (input) => {
      await setUserConfig(context.userId, "favorites", input, {
        supabase: context.supabase,
      });
      return { saved: true };
    },
  );
  add(
    "platform_personal_mcp_connections",
    "List the external MCP servers you personally connected via OAuth, without tokens.",
    "user",
    true,
    z.object({}),
    () =>
      listMCPOAuthConnections(context.userId, {
        supabase: context.supabaseServiceRole,
      }),
  );
  add(
    "platform_personal_mcp_disconnect",
    "Disconnect your OAuth authorization for an external MCP server.",
    "user",
    false,
    z.object({ serverUrl: z.url() }),
    async ({ serverUrl }) => {
      await deleteMCPOAuthConnection(context.userId, serverUrl, {
        supabase: context.supabaseServiceRole,
      });
      return { disconnected: true };
    },
  );
  add(
    "platform_asset_upload_url",
    "Create a signed upload URL for an avatar, theme asset or XRAG package. Upload bytes to the returned URL, then save the avatar/theme or publish the XRAG path. Theme/XRAG and other users' avatars require global admin.",
    "user",
    false,
    z.object({
      kind: z.enum(["avatar", "theme", "xrag"]),
      fileName: z.string(),
      userId: z.uuid().optional(),
    }),
    async ({ kind, fileName, userId }) => {
      const owner = userId ?? context.userId;
      if (kind !== "avatar" || owner !== context.userId)
        requirePlatformAccess(context.claims, context.level, "admin");
      return createAssetUpload(
        kind === "avatar"
          ? "user_avatars"
          : kind === "theme"
            ? "theme_logos"
            : "box-action-files",
        owner,
        fileName,
        { supabase: context.supabaseServiceRole },
      );
    },
  );
  add(
    "platform_view_preferences_get",
    "Read your saved grouping, sorting and table/card layout for a view ID.",
    "user",
    true,
    z.object({ id: z.string().min(1).max(100) }),
    ({ id }) =>
      getCurrentUserConfig(`groupSortView-${id}`, {
        supabase: context.supabase,
      }),
  );
  add(
    "platform_view_preferences_update",
    "Save your grouping, sorting and table/card layout for a view ID.",
    "user",
    false,
    z.object({
      id: z.string().min(1).max(100),
      preferences: preferencesSchema,
    }),
    async ({ id, preferences }) => {
      await setUserConfig(
        context.userId,
        `groupSortView-${id}`,
        preferences ?? {},
        { supabase: context.supabase },
      );
      return { saved: true };
    },
  );

  add(
    "platform_asset_upload",
    "Upload base64 asset bytes (up to 10 MiB) and return the reference for avatar/theme settings or XRAG publication. Larger assets can use platform_asset_upload_url.",
    "user",
    false,
    z.object({
      kind: z.enum(["avatar", "theme", "xrag"]),
      fileName: z.string(),
      userId: z.uuid().optional(),
      base64: z
        .string()
        .max(13981016)
        .regex(
          /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
        ),
      mimeType: z.string().max(200),
    }),
    async ({ kind, fileName, userId, base64, mimeType }) => {
      const owner = userId ?? context.userId;
      if (kind !== "avatar" || owner !== context.userId)
        requirePlatformAccess(context.claims, context.level, "admin");
      const bytes = Buffer.from(base64, "base64");
      if (bytes.length > 10 * 1024 * 1024) throw new Error("FILE_TOO_LARGE");
      return uploadAsset(
        kind === "avatar"
          ? "user_avatars"
          : kind === "theme"
            ? "theme_logos"
            : "box-action-files",
        owner,
        fileName,
        bytes,
        mimeType,
        { supabase: context.supabaseServiceRole },
      );
    },
  );
  add(
    "platform_profile_password_reset",
    "Set an email-account password using an existing, valid single-use reset key. Defaults to yourself; another userId additionally requires the admin level and global administrator permissions. Does not bypass reset-key validation or change SSO passwords. Passwords and keys are sensitive tool inputs.",
    "user",
    false,
    z.object({
      userId: z.uuid().optional(),
      password: z.string().min(6).max(1024),
      passwordResetKey: z.string().trim().min(1).max(256),
    }),
    async (input) => {
      const targetUserId = input.userId ?? context.userId;
      if (targetUserId !== context.userId)
        requirePlatformAccess(context.claims, context.level, "admin");
      const user = await getUserById(targetUserId, admin);
      if (!user.email || user.signInMethod !== "email")
        throw new Error("EMAIL_ACCOUNT_REQUIRED");
      await redeemPasswordResetKey({ ...input, email: user.email }, admin);
      return { saved: true };
    },
  );
}
