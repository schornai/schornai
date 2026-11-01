import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseDatabase } from "../packages/database/src/_shared/_types";
import { database } from "./helpers/supabase";
import { getSystemConfig } from "../packages/database/src/config/getSystemConfig";
import { getCurrentUserConfig } from "../packages/database/src/config/getCurrentUserConfig";
import { setCurrentUserConfig } from "../packages/database/src/config/setCurrentUserConfig";
import { getCurrentUser } from "../packages/database/src/user/getCurrentUser";
import { getCurrentUserClaims } from "../packages/database/src/user/getCurrentUserClaims";
import { isAdmin } from "../packages/database/src/user/isAdmin";
import { ensureAdmin } from "../packages/database/src/user/ensureAdmin";
import { mapUser } from "../packages/database/src/user/_mapper";
import { mapAIModel } from "../packages/database/src/aiModel/_mappers";
import { getAIModels } from "../packages/database/src/aiModel/getAIModels";
import { getAIModelsByType } from "../packages/database/src/aiModel/getAIModelsByType";
import { getAIModelById } from "../packages/database/src/aiModel/getAIModelById";
import { getAIModelByIdentifier } from "../packages/database/src/aiModel/getAIModelByIdentifier";
import {
  mapWorkspace,
  mapDBOrganizationDescription,
} from "../packages/database/src/workspace/_mappers";
import { getWorkspaces } from "../packages/database/src/workspace/getWorkspaces";
import { getWorkspaceById } from "../packages/database/src/workspace/getWorkspaceById";
import { getWorkspacesWithUserClaim } from "../packages/database/src/workspace/getWorkspacesWithUserClaim";
import { updateWorkspaceAutoJoin } from "../packages/database/src/workspace/updateWorkspaceAutoJoin";
import { updateWorkspaceDescription } from "../packages/database/src/workspace/updateWorkspaceDescription";
import { updateWorkspaceDocumentation } from "../packages/database/src/workspace/updateWorkspaceDocumentation";
import { updateWorkspaceSSOMapping } from "../packages/database/src/workspace/updateWorkspaceSSOMapping";

const workspaceRow = {
  id: "org",
  name: "Workspace",
  description: "plain description",
  created_at: "2026-01-01T00:00:00Z",
  auto_join: null,
  saml_mapping_editor: null,
  saml_mapping_user: null,
};
const modelRow = {
  id: "model",
  identifier: "legacy",
  name: "Model",
  created_at: "2026-01-01T00:00:00Z",
  description: "description",
  type: "ollama_llm_v1",
  config: { ollamaIdentifier: "actual-model" },
  image: null,
};

describe("configuration persistence", () => {
  it.each([
    ["system_settings", getSystemConfig],
    ["settings_user", getCurrentUserConfig],
  ] as const)("reads %s and propagates read errors", async (table, read) => {
    const { supabase, builders } = database({
      [table]: { data: { value: "config" } },
    });
    expect(await read("favorites" as never, { supabase } as any)).toBe(
      "config",
    );
    expect(builders[table]!.eq).toHaveBeenCalledWith("key", "favorites");
    expect(
      await read(
        "favorites" as never,
        { supabase: database({ [table]: { data: null } }).supabase } as any,
      ),
    ).toBeUndefined();
    const error = new Error("DB unavailable");
    await expect(
      read(
        "favorites" as never,
        { supabase: database({ [table]: { error } }).supabase } as any,
      ),
    ).rejects.toBe(error);
  });
  it.each([null, { value: { keep: 1, replace: "old" } }, { value: "legacy" }])(
    "patches only the requested user settings",
    async (existing) => {
      const { supabase, builders } = database({
        settings_user: { data: existing },
      });
      const auth = {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "u" } }, error: null }),
      };
      await setCurrentUserConfig("favorites", { replace: "new" }, {
        supabase: { ...supabase, auth },
      } as any);
      if (!existing)
        expect(builders.settings_user!.insert).toHaveBeenCalledWith({
          key: "favorites",
          user_id: "u",
          value: { replace: "new" },
        });
      else
        expect(builders.settings_user!.update).toHaveBeenCalledWith({
          value: {
            ...(typeof existing.value === "object" ? { keep: 1 } : {}),
            replace: "new",
          },
        });
    },
  );
});

describe("users and claims", () => {
  it("requires a signed-in user and propagates auth errors", async () => {
    expect(
      await getCurrentUser({
        supabaseAuth: {
          getUser: async () => ({ data: { user: { id: "u" } } }),
        },
      } as any),
    ).toEqual({ id: "u" });
    await expect(
      getCurrentUser({
        supabaseAuth: { getUser: async () => ({ data: { user: null } }) },
      } as any),
    ).rejects.toThrow("not signed in");
    const error = new Error("auth");
    await expect(
      getCurrentUser({
        supabaseAuth: {
          getUser: async () => ({ data: { user: null }, error }),
        },
      } as any),
    ).rejects.toBe(error);
  });
  it.each([
    undefined,
    null,
    "invalid",
    [],
    "admin",
    [{ organization_id: "org", role: "editor" }],
  ])("validates claims %j", async (organization_roles) => {
    const supabase = {
      auth: {
        getClaims: async () => ({ data: { claims: { organization_roles } } }),
      },
    } as any;
    expect(await getCurrentUserClaims({ supabaseAuth: supabase.auth })).toEqual(
      organization_roles === "admin" || Array.isArray(organization_roles)
        ? organization_roles
        : [],
    );
    expect(await isAdmin({ supabase })).toBe(organization_roles === "admin");
    if (organization_roles === "admin")
      await expect(ensureAdmin({ supabase })).resolves.toBeUndefined();
    else
      await expect(ensureAdmin({ supabase })).rejects.toThrow("not an admin");
  });
  it("handles absent claims and errors", async () => {
    expect(
      await getCurrentUserClaims({
        supabaseAuth: { getClaims: async () => ({ data: null }) },
      } as any),
    ).toEqual([]);
    expect(
      await isAdmin({
        supabase: { auth: { getClaims: async () => ({ data: null }) } },
      } as any),
    ).toBe(false);
    const error = new Error("claims");
    await expect(
      getCurrentUserClaims({
        supabaseAuth: { getClaims: async () => ({ error }) },
      } as any),
    ).rejects.toBe(error);
  });
  it("maps null profiles, sign-in providers, full names and dates", () => {
    const user = {
      id: "u",
      email: "u@test",
      app_metadata: { provider: "email" },
      last_sign_in_at: "2026-01-01T00:00:00Z",
    } as any;
    expect(
      mapUser(user, {
        first_name: " Ada ",
        last_name: "Lovelace",
        avatar_url: "avatar",
      } as any),
    ).toMatchObject({
      name: "Ada  Lovelace",
      avatarUrl: "avatar",
      signInMethod: "email",
      lastSignInAt: new Date(user.last_sign_in_at),
    });
    expect(
      mapUser(
        {
          ...user,
          app_metadata: { provider: "saml" },
          last_sign_in_at: undefined,
        },
        null,
      ),
    ).toMatchObject({
      firstName: undefined,
      lastName: undefined,
      name: undefined,
      signInMethod: "sso",
      lastSignInAt: undefined,
    });
  });
});

describe("model data access", () => {
  it("maps identifiers and image nullability across model types", () => {
    for (const type of ["ollama_llm_v1", "ollama_embedding_v1"])
      expect(mapAIModel({ ...modelRow, type } as any).identifier).toBe(
        "actual-model",
      );
    expect(
      mapAIModel({
        ...modelRow,
        type: "mlx_whisper_v1",
        image: { path: "image" },
      } as any),
    ).toMatchObject({ identifier: "legacy", image: { path: "image" } });
    expect(mapAIModel(modelRow as any).createdAt).toEqual(
      new Date(modelRow.created_at),
    );
  });
  it("lists, filters and looks up models with the correct predicate", async () => {
    const { supabase, builders } = database({
      ai_models: { data: [modelRow, { ...modelRow, type: "mlx_whisper_v1" }] },
    });
    expect(await getAIModels({ supabase } as any)).toHaveLength(2);
    expect(
      await getAIModelsByType("ollama_llm_v1", { supabase } as any),
    ).toHaveLength(1);
    const single = database({ ai_models: { data: modelRow } });
    expect(
      await getAIModelById("model", { supabase: single.supabase } as any),
    ).toMatchObject({ id: "model" });
    expect(single.builders.ai_models!.eq).toHaveBeenCalledWith("id", "model");
    expect(
      await getAIModelByIdentifier("actual-model", {
        supabase: single.supabase,
      } as any),
    ).toMatchObject({ id: "model" });
    expect(single.builders.ai_models!.eq).toHaveBeenCalledWith(
      "identifier",
      "actual-model",
    );
    expect(builders.ai_models!.select).toHaveBeenCalled();
  });
});

describe("workspace persistence", () => {
  it("maps legacy text and structured configs, preserving SSO mappings on serialization", () => {
    expect(mapWorkspace(workspaceRow as any)).toMatchObject({
      description: "plain description",
      autoJoin: false,
      documentation: undefined,
      samlMappingEditor: undefined,
    });
    const config = {
      version: "workspace-config-v1",
      description: "new",
      documentation: "docs",
      samlMappingWorkspaceAdmin: "admins",
    };
    const row = {
      ...workspaceRow,
      auto_join: true,
      saml_mapping_editor: "editors",
      saml_mapping_user: "users",
      description: JSON.stringify(config),
    };
    const workspace = mapWorkspace(row as any);
    expect(workspace).toMatchObject({
      description: "new",
      documentation: "docs",
      autoJoin: true,
      samlMappingEditor: "editors",
      samlMappingUser: "users",
      samlMappingWorkspaceAdmin: "admins",
    });
    expect(JSON.parse(mapDBOrganizationDescription(workspace))).toEqual(config);
  });
  it("lists workspaces and joins none, admin, editor and user roles", async () => {
    const rows = ["org", "none", "admin", "editor"].map((id) => ({
      ...workspaceRow,
      id,
    }));
    const { supabase } = database({
      organizations: { data: rows },
      user_roles: {
        data: [
          { organization_id: "org", role: "user" },
          { organization_id: "admin", role: "admin" },
          { organization_id: "editor", role: "editor" },
        ],
      },
    });
    expect(await getWorkspaces({ supabase } as any)).toHaveLength(4);
    expect(
      (
        await getWorkspacesWithUserClaim("u", {
          supabaseServiceRole: supabase,
        } as any)
      ).map((w) => w.userRole),
    ).toEqual(["user", "none", "none", "editor"]);
    expect(
      await getWorkspaceById("org", {
        supabase: database({ organizations: { data: workspaceRow } }).supabase,
      } as any),
    ).toMatchObject({ id: "org" });
  });
  it.each([
    { rows: [], expected: undefined },
    { rows: [workspaceRow], expected: { id: "org", name: "Workspace" } },
  ])("handles workspace query results: $rows", async ({ rows, expected }) => {
    const supabase = createClient<SupabaseDatabase>(
      "https://example.supabase.co",
      "test-key",
      {
        global: {
          fetch: async () =>
            new Response(JSON.stringify(rows), {
              headers: { "Content-Type": "application/json" },
            }),
        },
      },
    );
    const workspace = await getWorkspaceById("org", { supabase });
    if (expected) expect(workspace).toMatchObject(expected);
    else expect(workspace).toBeUndefined();
  });
  it("propagates workspace query errors", async () => {
    const error = new Error("DB unavailable");
    await expect(
      getWorkspaceById("org", {
        supabase: database({ organizations: { error } }).supabase,
      } as any),
    ).rejects.toBe(error);
  });
  it.each([
    [updateWorkspaceDescription, { name: "Name", description: "Description" }],
    [updateWorkspaceDocumentation, { documentation: "Docs" }],
    [updateWorkspaceSSOMapping, { samlMappingUser: "users" }],
  ] as const)(
    "rejects updates to absent workspaces (%s)",
    async (update, values) => {
      const { supabase, builders } = database({
        organizations: { data: null },
      });
      await expect(
        update(
          "org",
          values as any,
          {
            supabaseServiceRole: supabase,
          } as any,
        ),
      ).rejects.toThrow("WORKSPACE_NOT_FOUND");
      expect(builders.organizations!.update).not.toHaveBeenCalled();
    },
  );
  it("persists updates with the workspace ID and keeps structured fields", async () => {
    const { supabase, builders } = database({
      organizations: { data: workspaceRow },
    });
    const context = { supabaseServiceRole: supabase } as any;
    await updateWorkspaceAutoJoin("org", { autoJoin: true }, context);
    expect(builders.organizations!.update).toHaveBeenLastCalledWith({
      auto_join: true,
    });
    await updateWorkspaceDescription(
      "org",
      { name: "Name", description: "Description" },
      context,
    );
    expect(builders.organizations!.update).toHaveBeenLastCalledWith({
      name: "Name",
      description: JSON.stringify({
        description: "Description",
        version: "workspace-config-v1",
      }),
    });
    await updateWorkspaceDocumentation(
      "org",
      { documentation: "Docs" },
      context,
    );
    expect(
      JSON.parse(builders.organizations!.update.mock.lastCall![0].description)
        .documentation,
    ).toBe("Docs");
    await updateWorkspaceSSOMapping(
      "org",
      {
        samlMappingEditor: "editors",
        samlMappingUser: "users",
        samlMappingWorkspaceAdmin: "admins",
      },
      context,
    );
    expect(builders.organizations!.update.mock.lastCall![0]).toMatchObject({
      saml_mapping_editor: "editors",
      saml_mapping_user: "users",
    });
    expect(
      JSON.parse(builders.organizations!.update.mock.lastCall![0].description)
        .samlMappingWorkspaceAdmin,
    ).toBe("admins");
    await updateWorkspaceSSOMapping("org", {}, context);
    expect(builders.organizations!.update.mock.lastCall![0]).toMatchObject({
      saml_mapping_editor: null,
      saml_mapping_user: null,
    });
    expect(builders.organizations!.eq).toHaveBeenCalledWith("id", "org");
  });
});
