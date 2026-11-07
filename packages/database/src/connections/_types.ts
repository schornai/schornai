import type { SupabaseDatabase } from "../_shared/_types.ts";
export type ProviderConnection =
  SupabaseDatabase["public"]["Tables"]["provider_connections"]["Row"];
export type ConnectionMetadata = Pick<
  ProviderConnection,
  "id" | "name" | "kind" | "client_id" | "market" | "issuer"
>;
