import { z } from "zod/mini";
import { resourceSchema, type XRAGResource } from "xrag/schema";
import { agentConfigSchema } from "../agent/_schemas.ts";
import { transcriberSchema } from "../transcriber/_schemas.ts";
import { documentRepositoryConfigSchema } from "../documentRepositories/_schema.ts";

import { automationInputSchema } from "../automation/_schemas.ts";

const automationDataSchema = automationInputSchema.omit({ id: true });
const agentDataSchema = z.extend(agentConfigSchema, {
  name: z.string(),
  description: z.string(),
});
const transcriberDataSchema = z.omit(transcriberSchema, {
  id: true,
  identifier: true,
  workspaceId: true,
});
const repositoryDataSchema = z.extend(
  z.omit(documentRepositoryConfigSchema, {
    identifier: true,
  }),
  { name: z.string(), description: z.string() },
);

export type ResourceData =
  | { kind: "automation"; data: z.infer<typeof automationDataSchema> }
  | { kind: "agent"; data: z.infer<typeof agentDataSchema> }
  | { kind: "transcriber"; data: z.infer<typeof transcriberDataSchema> }
  | { kind: "documentRepository"; data: z.infer<typeof repositoryDataSchema> };

/** Use the same validation as the editors, without installation-local identity. */
export function parseResourceData(
  kind: XRAGResource["resourceType"],
  input: unknown,
): ResourceData {
  switch (kind) {
    case "automation":
      return { kind, data: automationDataSchema.parse(input) };
    case "agent":
      return { kind, data: agentDataSchema.parse(input) };
    case "transcriber":
      return { kind, data: transcriberDataSchema.parse(input) };
    case "documentRepository":
      return { kind, data: repositoryDataSchema.parse(input) };
  }
}

export function resourceDependencies(resource: ResourceData) {
  const references = new Map<
    string,
    { kind: XRAGResource["references"][number]["kind"]; identifier: string }
  >();
  function add(
    kind: XRAGResource["references"][number]["kind"],
    identifier?: string,
  ) {
    if (identifier)
      references.set(`${kind}:${identifier}`, { kind, identifier });
  }
  switch (resource.kind) {
    case "automation":
      add("agent", resource.data.agentId);
      if (resource.data.trigger.type === "storage") {
        if (resource.data.trigger.storage.type !== "documentRepository")
          throw new Error("XRAG_INSTALLATION_BOUND_CONFIGURATION");
        add(
          "documentRepository",
          resource.data.trigger.storage.documentRepositoryId,
        );
      }
      break;
    case "agent":
      add("model", resource.data.modelIdentifier);
      add("transcriber", resource.data.transcriberIdentifier);
      for (const role of resource.data.roles) {
        add("model", role.modelIdentifierOverride);
        for (const mount of role.documentRepositoryMounts)
          add("documentRepository", mount.documentRepositoryIdentifier);
      }
      break;
    case "transcriber":
      add("model", resource.data.modelIdentifier);
      break;
    case "documentRepository":
      add("model", resource.data.index?.embedding?.modelIdentifier);
      add("transcriber", resource.data.transcriberIdentifier);
      break;
  }
  return [...references.values()];
}

/** Secrets and account-bound connections never cross installations. */
export function serializeResource(
  kind: XRAGResource["resourceType"],
  input: unknown,
  id: string,
  references: XRAGResource["references"],
) {
  const resource = parseResourceData(kind, input);
  if (resource.kind === "agent") {
    delete resource.data.image;
    for (const role of resource.data.roles) {
      for (const mcp of role.mcps ?? []) {
        mcp.headers = {};
        delete mcp.oauthConnectionId;
      }
      if (role.toolWebAccess?.webSearchConnectionId) {
        delete role.toolWebAccess.webSearchConnectionId;
        role.toolWebAccess.webSearch = "off";
      }
    }
  }
  const archive = resourceSchema.parse({
    xrag_version: 2,
    xrag_type: "resource",
    resourceType: kind,
    id,
    data: resource.data,
    references,
  });
  parseResource(archive);
  return archive;
}

/** Validate the entire object and its reference map before any database writes. */
export function parseResource(input: unknown) {
  const archive = resourceSchema.parse(input);
  const resource = parseResourceData(archive.resourceType, archive.data);
  if (resource.kind === "agent") {
    if (
      resource.data.image ||
      resource.data.roles.some(
        (role) =>
          role.toolWebAccess?.webSearchConnectionId ||
          role.mcps?.some(
            (mcp) =>
              mcp.oauthConnectionId || Object.keys(mcp.headers).length > 0,
          ),
      )
    )
      throw new Error("XRAG_INSTALLATION_BOUND_CONFIGURATION");
  }
  const expected = new Set(
    resourceDependencies(resource).map(
      (ref) => `${ref.kind}:${ref.identifier}`,
    ),
  );
  const actual = new Set(
    archive.references.map((ref) => `${ref.kind}:${ref.identifier}`),
  );
  if (
    actual.size !== archive.references.length ||
    actual.size !== expected.size ||
    [...expected].some((key) => !actual.has(key))
  )
    throw new Error("XRAG_INVALID_REFERENCES");
  return { archive, resource };
}
