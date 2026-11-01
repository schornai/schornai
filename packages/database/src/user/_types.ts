import type { organizationRoleSchema, roleNameSchema } from "./_schemas.ts";
import type { Database } from "../_shared/_supabase.ts";
import type { z } from "zod/v4";

export type UserProfileDatabaseRow =
  Database["public"]["Tables"]["user_profiles"]["Row"];

export type User = {
  id: string;

  email?: string;

  firstName?: NonNullable<UserProfileDatabaseRow["first_name"]>;
  lastName?: NonNullable<UserProfileDatabaseRow["last_name"]>;

  name?: string;

  avatarUrl?: NonNullable<UserProfileDatabaseRow["avatar_url"]>;

  /** Stored upload, separate from the effective SSO fallback. */
  ownAvatarUrl?: string;

  signInMethod: "email" | "sso";
  lastSignInAt?: Date;
};

export type AccessTokenWebhookBody = {
  user_id: string;
  claims: Record<string, unknown> & {
    app_metadata?: {
      provider?: string;
    };
    user_metadata?: {
      custom_claims?: {
        groups?: unknown;
        overrides?: unknown;
      };
    };
  };
};

export type RoleName = z.infer<typeof roleNameSchema>;

export type OrganizationRoleClaim = z.infer<typeof organizationRoleSchema>;
