import { expect, it } from "vitest";
import {
  globalIdentifierSchema,
  identifierFromTitle,
  identifierFileName,
} from "../packages/xrag/src/identifier.ts";
import { getResourceIdentity } from "../packages/database/src/xrag/getResourceIdentity.ts";
import { query } from "./helpers/supabase.ts";
import { vi } from "vitest";
it.each([
  ["Mein Agent 2", "mein-agent-2"],
  ["Äpfel & große Dateien", "apfel-grosse-dateien"],
  [" / ", "object"],
  ["A".repeat(300), "a".repeat(180)],
])("creates a portable readable name from %s", (title, expected) =>
  expect(identifierFromTitle(title)).toBe(expected),
);
it.each(["team/agent_2", "a-z09", "legacy-uuid-123"])("accepts %s", (value) =>
  expect(globalIdentifierSchema.parse(value)).toBe(value),
);
it.each(["Upper", "has space", "dot.name", "back\\slash", "", "a".repeat(201)])(
  "rejects %s",
  (value) =>
    expect(globalIdentifierSchema.safeParse(value).success).toBe(false),
);
it("uses safe basenames without changing the logical identifier", () =>
  expect(identifierFileName("team/my_agent")).toBe("team-my_agent"));
it("resolves title collisions while keeping existing saved identities", async () => {
  const first = query({ error: { code: "23505" } }),
    second = query({ error: null }),
    read = query({
      data: { origin_id: "custom/name", workspace_id: "workspace" },
    });
  const supabase = {
    from: vi
      .fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second)
      .mockReturnValueOnce(read),
  };
  expect(
    await getResourceIdentity("agent", "local", "workspace", {
      supabase: supabase as any,
      name: "My Agent",
    }),
  ).toBe("custom/name");
  expect(first.upsert.mock.calls[0][0].origin_id).toBe("my-agent");
  expect(second.upsert.mock.calls[0][0].origin_id).toMatch(
    /^my-agent-[a-f0-9]{8}$/,
  );
});
