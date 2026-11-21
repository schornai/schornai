import { expect, it } from "vitest";
import {
  parseResource,
  serializeResource,
} from "../packages/database/src/xrag/resource.ts";

const id = "11111111-1111-4111-8111-111111111111";
const model = "22222222-2222-4222-8222-222222222222";
const repository = "33333333-3333-4333-8333-333333333333";
const refs = [
  { kind: "model" as const, id: model, identifier: "model" },
  {
    kind: "documentRepository" as const,
    id: repository,
    identifier: "repository",
  },
];
const agent = () => ({
  id,
  workspaceId: id,
  name: "Assistant",
  description: "Description",
  version: "agent-config-version-4",
  additionalFunctions: {},
  color: { type: "color-oklch-hue", oklchHue: 120 },
  icon: { type: "icon-lucide", iconName: "Bot" },
  image: {
    type: "supabase-storage-path",
    storage: "avatars",
    path: "private.png",
  },
  documentation: "Instructions",
  recommendedMessages: [],
  modelIdentifier: "model",
  modelThinking: "optional-on",
  roles: [
    {
      id,
      prompt: "Help",
      documentRepositoryMounts: [
        {
          id,
          documentRepositoryIdentifier: "repository",
          permission: "read-only",
        },
      ],
      mcps: [
        {
          id,
          url: "https://tools.example/mcp",
          type: "http",
          headers: { Authorization: "secret" },
          oauthConnectionId: id,
        },
      ],
      toolWebAccess: {
        active: true,
        webFetchAccess: "allow-all",
        webFetchAllowList: [],
        webSearchConnectionId: id,
        webSearch: "on",
      },
    },
  ],
});

it("exports agent behavior and global references without secrets or local ownership", () => {
  const source = agent();
  const archive = serializeResource("agent", source, id, refs);
  expect(archive.id).toBe(id);
  expect(archive.references).toEqual(refs);
  expect(archive.data).not.toHaveProperty("workspaceId");
  expect(archive.data).not.toHaveProperty("id");
  expect(archive.data).not.toHaveProperty("image");
  const { resource } = parseResource(archive);
  if (resource.kind !== "agent") throw new Error("wrong kind");
  expect(resource.data.roles[0]?.mcps?.[0]).toMatchObject({ headers: {} });
  expect(resource.data.roles[0]?.mcps?.[0]).not.toHaveProperty(
    "oauthConnectionId",
  );
  expect(resource.data.roles[0]?.toolWebAccess).toMatchObject({
    webSearch: "off",
  });
  expect(source.roles[0]!.mcps[0]!.headers.Authorization).toBe("secret");
});

it("rejects malicious inbound connection configuration", () => {
  const archive = serializeResource("agent", agent(), id, refs);
  expect(() => parseResource({ ...archive, data: agent() })).toThrow(
    "INSTALLATION_BOUND_CONFIGURATION",
  );
});

it("requires a complete, unambiguous reference map", () => {
  expect(() =>
    serializeResource("agent", agent(), id, refs.slice(0, 1)),
  ).toThrow("INVALID_REFERENCES");
  expect(() =>
    serializeResource("agent", agent(), id, [...refs, refs[0]!]),
  ).toThrow("INVALID_REFERENCES");
  expect(() =>
    serializeResource("agent", agent(), id, [
      ...refs,
      {
        kind: "transcriber",
        id,
        identifier: "unexpected",
      },
    ]),
  ).toThrow("INVALID_REFERENCES");
});

it("reuses transcriber validation and preserves prompt and retry settings", () => {
  const archive = serializeResource(
    "transcriber",
    {
      version: "transcriber-v2",
      id,
      identifier: id,
      workspaceId: id,
      name: "Transcriber",
      prompt: "Names",
      retryLevel: "thorough",
      modelIdentifier: "model",
    },
    id,
    refs.slice(0, 1),
  );
  expect(archive.data).toEqual({
    version: "transcriber-v2",
    name: "Transcriber",
    prompt: "Names",
    retryLevel: "thorough",
    modelIdentifier: "model",
  });
  expect(() =>
    parseResource({
      ...archive,
      data: { ...archive.data, retryLevel: "unknown" },
    }),
  ).toThrow();
});

it("exports document repository index settings and references", () => {
  const archive = serializeResource(
    "documentRepository",
    {
      id,
      workspaceId: id,
      identifier: id,
      name: "Knowledge",
      description: "Files",
      type: "database-v2",
      index: {
        embedding: {
          active: true,
          modelIdentifier: "model",
          modelVectorSize: 768,
        },
        keyword: { active: true },
      },
      transcriberIdentifier: "transcriber",
    },
    id,
    [
      refs[0]!,
      { kind: "transcriber", id: repository, identifier: "transcriber" },
    ],
  );
  expect(archive.data).not.toHaveProperty("identifier");
  expect(parseResource(archive).resource.kind).toBe("documentRepository");
});

it("exports personal automations with portable agent and document references", () => {
  const archive = serializeResource(
    "automation",
    {
      id,
      name: "Check documents",
      agentId: "agent",
      message: "Check",
      enabled: false,
      trigger: {
        type: "storage",
        storage: {
          type: "documentRepository",
          documentRepositoryId: "repo",
          workspaceId: "source",
        },
        events: ["uploaded"],
        folder: "/",
        includeSubfolders: true,
        attachment: "reference",
      },
      userId: "private-owner",
      nextRunAt: "private-runtime-state",
    },
    "daily-check",
    [
      { kind: "agent", identifier: "agent", id },
      { kind: "documentRepository", identifier: "repo", id: repository },
    ],
  );
  expect(archive.data).not.toHaveProperty("userId");
  expect(archive.data).not.toHaveProperty("nextRunAt");
  expect(parseResource(archive).resource.kind).toBe("automation");
});
it("rejects nonportable activity triggers instead of exporting local session references", () => {
  expect(() =>
    serializeResource(
      "automation",
      {
        name: "Check",
        agentId: "agent",
        message: "Check",
        enabled: false,
        trigger: {
          type: "storage",
          storage: { type: "activity", activityId: id, agentId: "agent" },
          events: ["uploaded"],
          folder: "/",
          includeSubfolders: false,
          attachment: "none",
        },
      },
      "check",
      [{ kind: "agent", identifier: "agent", id }],
    ),
  ).toThrow("XRAG_INSTALLATION_BOUND_CONFIGURATION");
});
