export type ServiceRoleConfig = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
};

export type SSOProviderAttributeMappingKeys = Record<
  string,
  { array?: boolean; name?: string }
>;

export type SSOProvider = {
  created_at: string;
  disabled: boolean | null;
  domains: string[];
  id: string;
  saml: {
    attribute_mapping?: { keys?: SSOProviderAttributeMappingKeys };
    entity_id: string;
    metadata_url?: string;
    metadata_xml?: string;
  };
  updated_at: string;
};
