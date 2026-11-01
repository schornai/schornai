import type { Database } from "../_shared/_supabase.ts";

export type Role = "admin" | "workspace-admin" | "editor" | "user";

export type OrganizationDatabaseRow =
  Database["public"]["Tables"]["organizations"]["Row"];

export type Workspace = {
  id: OrganizationDatabaseRow["id"];

  createdAt: Date; // <-- map ChatDatabaseRow['created_at'];

  name: OrganizationDatabaseRow["name"];
  description: OrganizationDatabaseRow["description"];

  documentation?: string;

  autoJoin: NonNullable<OrganizationDatabaseRow["auto_join"]>;

  samlMappingUser?: NonNullable<OrganizationDatabaseRow["saml_mapping_user"]>;
  samlMappingEditor?: NonNullable<
    OrganizationDatabaseRow["saml_mapping_editor"]
  >;
  samlMappingWorkspaceAdmin?: string;
};

export type WorkspaceRole = {
  workspace: Workspace;
  role: Role;
};
