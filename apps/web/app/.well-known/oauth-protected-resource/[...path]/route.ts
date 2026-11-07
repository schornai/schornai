import { mcpRequestOrigin } from "@/lib/mcp/requestOrigin";
import { platformAccessLevels } from "@schornio/aibox-package-database/mcp/platformAccess";
export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const path = `/${(await context.params).path.join("/")}`;
  if (path !== "/mcp") return new Response(null, { status: 404 });
  const origin = mcpRequestOrigin(request);
  return Response.json(
    {
      resource: `${origin}${path}`,
      authorization_servers: [origin],
      scopes_supported: platformAccessLevels,
      bearer_methods_supported: ["header"],
    },
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
}
