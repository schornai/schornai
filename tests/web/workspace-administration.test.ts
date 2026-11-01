import "./client-setup";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { database } from "../helpers/supabase";

const state = vi.hoisted(() => ({
  claims: [] as any,
  db: undefined as any,
  service: undefined as any,
  elevate: vi.fn(),
}));
vi.mock("@/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: async () => state.db,
}));
vi.mock("@/lib/supabase/createSupabaseServiceRoleClient", () => ({
  createSupabaseServiceRoleClient: state.elevate,
}));
vi.mock("@/lib/serverActionClient", () => ({
  serverActionClient: {
    inputSchema: (schema: any) => ({
      action: (handler: any) => async (input: any) =>
        handler({ parsedInput: schema.parse(input) }),
    }),
  },
}));
vi.mock("@/lib/groupSortView/model", () => ({
  getGroupSortViewPreferences: async () => ({}),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
import { getWorkspaceAdminContext } from "../../apps/web/lib/supabase/getWorkspaceAdminContext";
import { saveCreateSupabaseServiceRoleClient } from "../../apps/web/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { updateDescription } from "../../apps/web/app/(settings)/settings/workspace/_actions/updateDescription";
import { updateDocs } from "../../apps/web/app/(settings)/settings/workspace/_actions/updateDocumentation";
import { updateAutoJoin } from "../../apps/web/app/(settings)/settings/workspace/_actions/updateAutoJoin";
import { updateSSOMapping } from "../../apps/web/app/(settings)/settings/workspace/_actions/updateSSOMapping";
import { updatePermission } from "../../apps/web/app/(settings)/settings/_actions/updatePermission";
import { WorkspaceEditorPermissions } from "../../apps/web/app/(settings)/settings/workspace/[workspaceId]/_components/WorkspaceEditorPermissions";

let builders: any;
beforeEach(() => {
  vi.clearAllMocks();
  state.claims = [{ organization_id: "own", role: "workspace-admin" }];
  ({ supabase: state.service, builders } = database({
    organizations: {
      data: {
        id: "own",
        name: "Own",
        description: "",
        created_at: "2026-01-01",
      },
    },
    user_roles: { data: null },
    user_profiles: { data: [] },
  }));
  state.db = state.service;
  state.db.auth = {
    getClaims: async () => ({
      data: { claims: { organization_roles: state.claims } },
      error: null,
    }),
    admin: {
      listUsers: vi.fn(async () => ({ data: { users: [] }, error: null })),
    },
  };
  state.elevate.mockReturnValue(state.service);
});
const workspaceWrites = [
  () => updateDescription({ workspaceId: "own", name: "Updated" }),
  () => updateDocs({ workspaceId: "own", docs: "Help" }),
];
const membershipWrites = [
  () => updateAutoJoin({ workspaceId: "own", autoJoin: true }),
  () =>
    updateSSOMapping({
      workspaceId: "own",
      samlMappingWorkspaceAdmin: "admins",
    }),
  ...["workspace-admin", "editor", "user", "none"].map(
    (role) => () =>
      updatePermission({ workspaceId: "own", userId: "member", role }),
  ),
];

function setRole(role: string | undefined) {
  state.claims =
    role === "admin"
      ? "admin"
      : role === "foreign"
        ? [{ organization_id: "other", role: "workspace-admin" }]
        : role
          ? [{ organization_id: "own", role }]
          : [];
}

describe("workspace administration boundaries", () => {
  it.each(["user", "editor", undefined, "foreign"])(
    "rejects workspace edits by %s before obtaining service-role access",
    async (role) => {
      setRole(role);
      await expect(getWorkspaceAdminContext("own")).rejects.toThrow(
        "NOT_AUTHORIZED",
      );
      for (const write of workspaceWrites)
        await expect(write()).rejects.toThrow("NOT_AUTHORIZED");
      expect(state.elevate).not.toHaveBeenCalled();
      expect(builders.organizations.update).not.toHaveBeenCalled();
    },
  );
  it.each(["workspace-admin", "admin"])(
    "permits description and documentation edits for %s",
    async (role) => {
      setRole(role);
      for (const write of workspaceWrites) await write();
      expect(builders.organizations.eq).toHaveBeenCalledWith("id", "own");
      expect(builders.user_roles.insert).not.toHaveBeenCalled();
    },
  );
  it.each(["workspace-admin", "user", "editor", undefined, "foreign"])(
    "rejects membership reads and writes by %s before obtaining service-role access",
    async (role) => {
      setRole(role);
      await expect(
        WorkspaceEditorPermissions({ workspaceId: "own" }),
      ).rejects.toThrow("NOT_AUTHORIZED");
      for (const write of membershipWrites)
        await expect(write()).rejects.toThrow("NOT_AUTHORIZED");
      expect(state.elevate).not.toHaveBeenCalled();
      expect(state.service.auth.admin.listUsers).not.toHaveBeenCalled();
      expect(builders.organizations.update).not.toHaveBeenCalled();
      for (const operation of ["insert", "update", "delete"])
        expect(builders.user_roles[operation]).not.toHaveBeenCalled();
    },
  );
  it("permits membership management only for global admins", async () => {
    setRole("admin");
    for (const write of membershipWrites) await write();
    expect(builders.organizations.eq).toHaveBeenCalledWith("id", "own");
    for (const role of ["workspace-admin", "editor", "user"])
      expect(builders.user_roles.insert).toHaveBeenCalledWith({
        organization_id: "own",
        user_id: "member",
        role,
      });
    expect(builders.user_roles.delete).toHaveBeenCalledOnce();
    expect(builders.user_roles.eq).toHaveBeenCalledWith(
      "organization_id",
      "own",
    );
    expect(builders.user_roles.eq).toHaveBeenCalledWith("user_id", "member");
    await expect(
      WorkspaceEditorPermissions({ workspaceId: "own" }),
    ).resolves.toBeDefined();
    expect(state.service.auth.admin.listUsers).toHaveBeenCalled();
  });
  it("keeps global administration and other workspaces protected", async () => {
    await expect(saveCreateSupabaseServiceRoleClient()).rejects.toThrow(
      "NOT_AUTHORIZED",
    );
    await expect(getWorkspaceAdminContext("other")).rejects.toThrow(
      "NOT_AUTHORIZED",
    );
    await expect(
      updateDescription({ workspaceId: "other", name: "No" }),
    ).rejects.toThrow("NOT_AUTHORIZED");
    await expect(
      updatePermission({ workspaceId: "own", userId: "member", role: "admin" }),
    ).rejects.toThrow();
    expect(state.elevate).not.toHaveBeenCalled();
  });
});
