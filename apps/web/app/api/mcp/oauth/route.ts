import { getT } from "next-i18next/server";
import { pendingMCPApproval } from "@/lib/mcp/pendingApproval";
import { mcpRequestOrigin } from "@/lib/mcp/requestOrigin";
import { auth } from "@ai-sdk/mcp";
import { MCPOAuthProvider } from "@schornio/aibox-realtime/mcp/MCPOAuthProvider";
import { authorizeMCP } from "@/lib/mcp/authorizeMCP";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";

export async function POST(request: Request) {
  let origin: string;
  try {
    origin = mcpRequestOrigin(request);
  } catch {
    return new Response(null, { status: 403 });
  }
  if (request.headers.get("origin") !== origin)
    return new Response(null, { status: 403 });
  try {
    const form = await request.formData();
    const agentId = String(form.get("agentId") ?? "");
    const mcpId = String(form.get("mcpId") ?? "");
    const { user, mcp } = await authorizeMCP(agentId, mcpId);
    const activityId = String(form.get("activityId") ?? "");
    const approvalId = String(form.get("approvalId") ?? "");
    await pendingMCPApproval({ agentId, activityId, approvalId, mcpId });
    const fallback = `/agent/${encodeURIComponent(agentId)}`;
    const candidate = new URL(String(form.get("returnTo") ?? fallback), origin);
    const returnTo =
      candidate.origin === origin &&
      candidate.pathname.startsWith(`${fallback}/`)
        ? candidate.pathname
        : fallback;
    const provider = await MCPOAuthProvider.load(user.id, mcp.url, {
      supabase: createSupabaseServiceRoleClient(),
      mcpId,
      interactive: true,
      agentId,
    });
    await provider.prepareLogin({
      redirectUrl: `${origin}/api/mcp/oauth/callback`,
      returnTo,
      agentId,
      mcpId,
      activityId,
      approvalId,
    });
    // Discovery/initialize can be public even when the pending tool needs
    // OAuth. Start from its saved challenge without executing the tool here.
    const result = await auth(provider, provider.authorizationOptions);
    if (result === "AUTHORIZED") {
      await pendingMCPApproval(
        { agentId, activityId, approvalId, mcpId },
        true,
      );
    } else if (!provider.authorizationUrl) {
      throw new Error("Authorization redirect missing");
    }
    return new Response(null, {
      status: 303,
      headers: {
        Location:
          provider.authorizationUrl?.href ?? new URL(returnTo, origin).href,
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    const { t } = await getT("agent", { keyPrefix: "mcpOAuth" });
    return new Response(
      t(
        missingClientRegistration(error) ? "errorClientRequired" : "errorStart",
      ),
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}

function missingClientRegistration(error: unknown): boolean {
  for (let i = 0; i < 8 && error instanceof Error; i++, error = error.cause) {
    if (error.message === "MCP_OAUTH_CONNECTION_UNAVAILABLE") return true;
    if (
      error.message ===
      "Incompatible auth server: does not support dynamic client registration"
    )
      return true;
  }
  return false;
}
