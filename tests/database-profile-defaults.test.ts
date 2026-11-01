import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";
import { mapUser } from "../packages/database/src/user/_mapper";

const user = {
  id: "sso-user",
  app_metadata: { provider: "sso:provider" },
  user_metadata: {
    custom_claims: {
      firstName: "SSO First",
      lastName: "SSO Last",
      avatarUrl: "https://idp.test/avatar.png",
    },
  },
} as unknown as User;
const profile = {
  id: user.id,
  first_name: null,
  last_name: null,
  avatar_url: null,
};

describe("SSO profile defaults", () => {
  it.each([undefined, null, profile])(
    "uses SSO defaults with missing or empty profile %s",
    (row) => {
      expect(mapUser(user, row)).toMatchObject({
        firstName: "SSO First",
        lastName: "SSO Last",
        name: "SSO First SSO Last",
        avatarUrl: "https://idp.test/avatar.png",
        ownAvatarUrl: undefined,
      });
    },
  );
  it("merges each field independently and preserves explicitly empty local names", () => {
    expect(
      mapUser(user, {
        ...profile,
        first_name: "Local",
        avatar_url: "user_avatars/sso-user/own.png",
      }),
    ).toMatchObject({
      firstName: "Local",
      lastName: "SSO Last",
      avatarUrl: "user_avatars/sso-user/own.png",
      ownAvatarUrl: "user_avatars/sso-user/own.png",
    });
    expect(
      mapUser(user, { ...profile, first_name: "", last_name: "" }),
    ).toMatchObject({ firstName: "", lastName: "", name: undefined });
  });
  it("keeps local overrides after a new SSO login and uses refreshed defaults for other fields", () => {
    const refreshed = {
      ...user,
      user_metadata: {
        custom_claims: {
          firstName: "Changed",
          lastName: "Changed Last",
          avatarUrl: "https://idp.test/new.png",
        },
      },
    };
    expect(
      mapUser(refreshed, {
        ...profile,
        first_name: "Local",
        avatar_url: "user_avatars/sso-user/own.png",
      }),
    ).toMatchObject({
      firstName: "Local",
      lastName: "Changed Last",
      avatarUrl: "user_avatars/sso-user/own.png",
    });
    expect(mapUser(refreshed, profile).avatarUrl).toBe(
      "https://idp.test/new.png",
    );
  });
  it("accepts snake_case SAML mappings", () => {
    expect(
      mapUser(
        {
          ...user,
          user_metadata: {
            custom_claims: {
              first_name: "First",
              last_name: "Last",
              avatar_url: "https://idp.test/a.png",
            },
          },
        },
        profile,
      ),
    ).toMatchObject({
      firstName: "First",
      lastName: "Last",
      avatarUrl: "https://idp.test/a.png",
    });
  });
  it.each([
    null,
    [],
    "invalid",
    { firstName: {}, lastName: ["Name"], avatarUrl: "javascript:alert(1)" },
    { avatarUrl: "user_avatars/another-user/avatar.png" },
  ])("ignores malformed claims and non-HTTP SSO avatars %s", (claims) => {
    expect(
      mapUser({ ...user, user_metadata: { custom_claims: claims } }, profile),
    ).toMatchObject({
      firstName: undefined,
      lastName: undefined,
      avatarUrl: undefined,
    });
  });
  it("preserves email profiles without SSO claims", () => {
    expect(
      mapUser(
        { ...user, app_metadata: { provider: "email" }, user_metadata: {} },
        { ...profile, first_name: "Local" },
      ),
    ).toMatchObject({
      firstName: "Local",
      lastName: undefined,
      avatarUrl: undefined,
      signInMethod: "email",
    });
  });
});
