import { getT } from "next-i18next/server";
import { pendingMCPApproval } from "@/lib/mcp/pendingApproval";
import { mcpRequestOrigin } from "@/lib/mcp/requestOrigin";
import { auth } from "@ai-sdk/mcp";
import { MCPOAuthProvider } from "@schornio/aibox-realtime/mcp/MCPOAuthProvider";
import { consumeMCPOAuthState } from "@schornio/aibox-package-database/mcp/consumeMCPOAuthState";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { authorizeMCP } from "@/lib/mcp/authorizeMCP";

export async function GET(request: Request) {
  const headers = {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  };
  try {
    const url = new URL(request.url);
    const origin = mcpRequestOrigin(request);
    const state = url.searchParams.get("state");
    if (!state) throw new Error("Missing state");
    const {
      data: { user },
    } = await (await createSupabaseServerClient()).auth.getUser();
    if (!user) throw new Error("Authentication required");
    const supabase = createSupabaseServiceRoleClient();
    // Consume before exchanging the code: replay and concurrent callbacks fail.
    const session = await consumeMCPOAuthState(user.id, state, { supabase });
    const provider = new MCPOAuthProvider(session, { supabase, mcpId: "" });
    const { agentId, mcpId, returnTo, activityId, approvalId } =
      provider.loginContext;
    if (
      !agentId ||
      !mcpId ||
      !returnTo ||
      !activityId ||
      !approvalId ||
      provider.redirectUrl !== `${origin}/api/mcp/oauth/callback`
    )
      throw new Error("Invalid login context");
    const { mcp } = await authorizeMCP(agentId, mcpId);
    if (mcp.url !== session.server_url)
      throw new Error("MCP configuration changed");
    await provider.useConfiguredClient(agentId, mcpId);
    const code = url.searchParams.get("code");
    if (url.searchParams.has("error") || !code)
      throw new Error("Authorization declined");
    const result = await auth(provider, {
      ...provider.authorizationOptions,
      authorizationCode: code,
      callbackState: state,
      callbackIssuer: url.searchParams.get("iss") ?? undefined,
    });
    if (result !== "AUTHORIZED") throw new Error("Authorization incomplete");
    await pendingMCPApproval({ agentId, activityId, approvalId, mcpId }, true);
    const destination = new URL(returnTo, origin);
    if (destination.origin !== origin) throw new Error("Invalid return URL");
    return new Response(null, {
      status: 303,
      headers: { ...headers, Location: destination.href },
    });
  } catch {
    const { t } = await getT("agent", { keyPrefix: "mcpOAuth" });
    return new Response(t("errorCallback"), { status: 400, headers });
  }
}
