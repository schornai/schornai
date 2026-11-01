import type { SupabaseDatabase } from "../_shared/_types.ts";
export type MCPOAuthSession =
  SupabaseDatabase["public"]["Tables"]["mcp_oauth_sessions"]["Row"];
