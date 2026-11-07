import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { revalidatePath } from "next/cache";
import { createPlatformTools } from "@schornio/aibox-realtime/platform/tools";
import { getRealtimeServerToken } from "@schornio/aibox-realtime/server/getRealtimeServerToken";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import {
  platformAccessPath,
  type PlatformAccessLevel,
} from "@schornio/aibox-package-database/mcp/platformAccess";
import { mcpRequestOrigin } from "@/lib/mcp/requestOrigin";
import { authenticatePlatformMcp } from "./authenticate";

export function platformMcpHandler(level: PlatformAccessLevel) {
  return async (request: Request) => {
    const origin = mcpRequestOrigin(request);
    const resource = `${origin}${platformAccessPath(level)}`;
    let context;
    try {
      context = await authenticatePlatformMcp(request, resource, level);
    } catch {
      return new Response(null, { status: 403 });
    }
    if (!context)
      return new Response(null, {
        status: 401,
        headers: {
          "WWW-Authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource${platformAccessPath(level)}", scope="${level}"`,
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Expose-Headers": "WWW-Authenticate",
        },
      });
    const requestOrigin = request.headers.get("origin");
    if (
      requestOrigin &&
      requestOrigin !== origin &&
      requestOrigin !== context.clientOrigin
    )
      return new Response(null, { status: 403 });
    if (request.method !== "POST")
      return new Response(null, { status: 405, headers: { Allow: "POST" } });
    const tools = createPlatformTools({
      ...context,
      getSsoConfig: () => {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseServiceRoleKey)
          throw new Error("SSO_NOT_CONFIGURED");
        return { supabaseUrl, supabaseServiceRoleKey };
      },
      serverToken: getRealtimeServerToken(),
      websocketProvider: new ServerRealtimeWebsocketProvider(),
    });
    const server = new Server(
      { name: "schornai", version: "1.0.0" },
      { capabilities: { tools: {} } },
    );
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: { ...tool.inputSchema, type: "object" as const },
        annotations: {
          readOnlyHint: tool.readOnly,
          destructiveHint: !tool.readOnly,
          openWorldHint: false,
        },
      })),
    }));
    server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
      const tool = tools.find((tool) => tool.name === params.name);
      if (!tool)
        return {
          isError: true,
          content: [{ type: "text" as const, text: "UNKNOWN_TOOL" }],
        };
      try {
        const result = await tool.execute(params.arguments ?? {});
        if (!tool.readOnly) revalidatePath("/", "layout");
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result ?? { success: true }),
            },
          ],
        };
      } catch {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: "OPERATION_FAILED: Check your permissions and input, then read the current resource state before retrying.",
            },
          ],
        };
      }
    });
    await server.connect(transport);
    try {
      const response = await transport.handleRequest(request);
      response.headers.set("Cache-Control", "no-store");
      if (requestOrigin)
        response.headers.set("Access-Control-Allow-Origin", requestOrigin);
      response.headers.set(
        "Access-Control-Expose-Headers",
        "WWW-Authenticate, MCP-Protocol-Version",
      );
      return response;
    } finally {
      await server.close();
    }
  };
}

export function platformMcpOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id",
      "Access-Control-Expose-Headers": "WWW-Authenticate, MCP-Protocol-Version",
    },
  });
}
