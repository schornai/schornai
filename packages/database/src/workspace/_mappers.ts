import type { OrganizationDatabaseRow, Workspace } from "./_types.ts";
import { trySync } from "@schornio/aibox-package-utils/trySync";
import { workspaceConfigSchema } from "./_schemas.ts";
import type { z } from "zod/mini";

export function mapWorkspace(
  dbOrganization: OrganizationDatabaseRow,
): Workspace {
  const { data: config } = workspaceConfigSchema.safeParse(
    trySync(() => JSON.parse(dbOrganization.description) as unknown).data,
  );

  return {
    autoJoin: dbOrganization.auto_join ?? false,
    createdAt: new Date(dbOrganization.created_at),
    description: config?.description ?? dbOrganization.description,
    documentation: config?.documentation,
    id: dbOrganization.id,
    name: dbOrganization.name,
    samlMappingEditor: dbOrganization.saml_mapping_editor ?? undefined,
    samlMappingUser: dbOrganization.saml_mapping_user ?? undefined,
    samlMappingWorkspaceAdmin: config?.samlMappingWorkspaceAdmin,
  };
}

export function mapDBOrganizationDescription(workspace: Workspace) {
  return JSON.stringify({
    description: workspace.description,
    documentation: workspace.documentation,
    samlMappingWorkspaceAdmin: workspace.samlMappingWorkspaceAdmin,
    version: "workspace-config-v1",
  } satisfies z.infer<typeof workspaceConfigSchema>);
}
