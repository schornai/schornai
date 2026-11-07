import { mcpRequestOrigin } from "@/lib/mcp/requestOrigin";
import { platformAccessLevels } from "@schornio/aibox-package-database/mcp/platformAccess";
export async function GET(request: Request) {
  const origin = mcpRequestOrigin(request);
  return Response.json(
    {
      issuer: origin,
      authorization_endpoint: `${origin}/oauth/authorize`,
      token_endpoint: `${origin}/api/platform-mcp/token`,
      registration_endpoint: `${origin}/api/platform-mcp/register`,
      revocation_endpoint: `${origin}/api/platform-mcp/revoke`,
      scopes_supported: platformAccessLevels,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      token_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
    },
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
}
