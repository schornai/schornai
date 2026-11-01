import { describe, expect, it, vi } from "vitest";
import { database } from "./helpers/supabase";
import { createAgent } from "../packages/database/src/agent/createAgent";
import { updateAgent } from "../packages/database/src/agent/updateAgent";
import { deleteAgent } from "../packages/database/src/agent/deleteAgent";
import { createDocumentRepository } from "../packages/database/src/documentRepositories/createDocumentRepository";
import { updateDocumentRepository } from "../packages/database/src/documentRepositories/updateDocumentRepository";
import { deleteDocumentRepository } from "../packages/database/src/documentRepositories/deleteDocumentRepository";
import { createTranscriber } from "../packages/database/src/transcriber/createTranscriber";
import { updateTranscriber } from "../packages/database/src/transcriber/updateTranscriber";
import { deleteTranscriber } from "../packages/database/src/transcriber/deleteTranscriber";
import { updateUserPermission } from "../packages/database/src/user/updateUserPermission";
import { updateUserProfileName } from "../packages/database/src/user/updateUserProfileName";
import { updateUserAvatar } from "../packages/database/src/user/updateUserAvatar";
import { deleteUserAvatar } from "../packages/database/src/user/deleteUserAvatar";

const item = {
  id: "id",
  name: "Name",
  description: "Description",
  workspaceId: "workspace",
  version: "v",
  prompt: "prompt",
} as any;

describe("entity writes", () => {
  it.each([
    ["chatbots", createAgent, updateAgent, deleteAgent, "agentId"],
    [
      "databases",
      createDocumentRepository,
      updateDocumentRepository,
      deleteDocumentRepository,
      "documentRepositoryId",
    ],
    [
      "transcribers",
      createTranscriber,
      updateTranscriber,
      deleteTranscriber,
      undefined,
    ],
  ] as const)(
    "creates, updates and deletes %s with correct scoping",
    async (table, create, update, remove, key) => {
      const { supabase, builders } = database({ [table]: { data: item } });
      const context = { supabase } as any;
      const created = await create(item, context);
      const insertion = builders[table]!.insert.mock.lastCall![0];
      expect(insertion).toMatchObject({
        name: item.name,
        description: item.description,
        organization_id: item.workspaceId,
      });
      expect(insertion.config).not.toHaveProperty("workspaceId");
      if (key) expect(created).toEqual({ [key]: insertion.id });
      else
        expect(insertion).toMatchObject({ id: item.id, prompt: item.prompt });
      await update(item, context);
      expect(builders[table]!.update.mock.lastCall![0]).toMatchObject({
        name: item.name,
        organization_id: item.workspaceId,
      });
      expect(builders[table]!.eq).toHaveBeenCalledWith("id", item.id);
      await remove("remove-id", context);
      expect(builders[table]!.delete).toHaveBeenCalled();
      expect(builders[table]!.eq).toHaveBeenCalledWith("id", "remove-id");
    },
  );
  it.each([
    ["chatbots", createAgent],
    ["databases", createDocumentRepository],
    ["transcribers", createTranscriber],
  ] as const)(
    "does not report creation success on failed %s writes",
    async (table, create) => {
      const error = new Error("write failed");
      await expect(
        create(item, {
          supabase: database({ [table]: { error } }).supabase,
        } as any),
      ).rejects.toBe(error);
    },
  );
});

describe("user mutation scoping", () => {
  it.each([
    ["none", null],
    ["editor", null],
    ["user", { id: "existing" }],
  ])("handles role %s and existing record %j", async (role, existing) => {
    const { supabase, builders } = database({ user_roles: { data: existing } });
    await updateUserPermission(
      { role, userId: "user", workspaceId: "workspace" } as any,
      { supabaseServiceRole: supabase } as any,
    );
    const builder = builders.user_roles!;
    if (role === "none") expect(builder.delete).toHaveBeenCalledOnce();
    else if (existing) expect(builder.update).toHaveBeenCalledWith({ role });
    else
      expect(builder.insert).toHaveBeenCalledWith({
        organization_id: "workspace",
        role,
        user_id: "user",
      });
    expect(builder.eq).toHaveBeenCalledWith("organization_id", "workspace");
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user");
  });
  it("upserts profile names and avatar URLs with an explicit ID conflict target", async () => {
    const { supabase, builders } = database({ user_profiles: { data: null } });
    const context = { supabaseServiceRole: supabase } as any;
    await updateUserProfileName(
      "user",
      { firstName: "Ada", lastName: "Lovelace" },
      context,
    );
    expect(builders.user_profiles!.upsert).toHaveBeenLastCalledWith(
      { id: "user", first_name: "Ada", last_name: "Lovelace" },
      { onConflict: "id" },
    );
    await updateUserAvatar("user", { avatarUrl: "avatars/image" }, context);
    expect(builders.user_profiles!.upsert).toHaveBeenLastCalledWith(
      { id: "user", avatar_url: "avatars/image" },
      { onConflict: "id" },
    );
    await deleteUserAvatar("user", context);
    expect(builders.user_profiles!.upsert).toHaveBeenLastCalledWith(
      { id: "user", avatar_url: null },
      { onConflict: "id" },
    );
  });
});
