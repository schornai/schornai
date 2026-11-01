import { fetchWithValidatedEndpoint } from "@ai-sdk/provider-utils";
import { getMCPOAuthClient } from "@schornio/aibox-package-database/mcp/getMCPOAuthClient";
import type {
  OAuthClientProvider,
  OAuthTokens,
  OAuthClientInformation,
  OAuthAuthorizationServerInformation,
} from "@ai-sdk/mcp";
import type {
  SupabaseClient,
  SupabaseDatabase,
} from "@schornio/aibox-package-database/_shared/_types";
import type { MCPOAuthSession } from "@schornio/aibox-package-database/mcp/_types";
import { getMCPOAuthSession } from "@schornio/aibox-package-database/mcp/getMCPOAuthSession";
import { saveMCPOAuthSession } from "@schornio/aibox-package-database/mcp/saveMCPOAuthSession";

type ConfiguredClient = NonNullable<
  Awaited<ReturnType<typeof getMCPOAuthClient>>
>;
type SessionData = {
  challenge?: { resourceMetadataUrl?: string; scope?: string };
  clientVersion?: string;
  tokens?: OAuthTokens;
  client?: OAuthClientInformation;
  authorizationServer?: OAuthAuthorizationServerInformation;
  verifier?: string;
  redirectUrl?: string;
  returnTo?: string;
  agentId?: string;
  mcpId?: string;
  activityId?: string;
  approvalId?: string;
};

export class MCPAuthorizationRequired extends Error {
  constructor(mcpId: string) {
    super(`MCP_AUTH_REQUIRED:${mcpId}`);
  }
}

/** Server-only OAuth provider. The caller authenticates the user and checks
 * access to the configured agent before loading credentials with service role.
 * SDK auth handles discovery, PKCE, issuer pinning, and refresh on HTTP 401. */
export class MCPOAuthProvider implements OAuthClientProvider {
  private session: MCPOAuthSession;
  private persisted: boolean;
  private data: SessionData;
  private supabase: SupabaseClient;
  private mcpId: string;
  private interactive: boolean;
  private configuredClient?: ConfiguredClient;
  authorizationUrl?: URL;

  constructor(
    session: MCPOAuthSession,
    options: {
      supabase: SupabaseClient;
      mcpId: string;
      interactive?: boolean;
      persisted?: boolean;
      configuredClient?: ConfiguredClient;
    },
  ) {
    this.session = session;
    this.configuredClient = options.configuredClient;
    this.data = session.data as SessionData;
    this.persisted = options.persisted ?? true;
    this.supabase = options.supabase;
    this.mcpId = options.mcpId;
    this.interactive = options.interactive ?? false;
  }

  static async load(
    userId: string,
    serverUrl: string,
    options: {
      supabase: SupabaseClient;
      mcpId: string;
      interactive?: boolean;
      agentId?: string;
    },
  ) {
    const session = await getMCPOAuthSession(userId, serverUrl, options);
    const configuredClient = options.agentId
      ? await getMCPOAuthClient(
          options.agentId,
          options.mcpId,
          serverUrl,
          options,
        )
      : null;
    if (
      session &&
      session.data &&
      (session.data as SessionData).clientVersion !== configuredClient?.version
    ) {
      session.data = {};
      session.state = null;
      session.state_expires_at = null;
    }
    return new MCPOAuthProvider(
      session ?? {
        user_id: userId,
        server_url: serverUrl,
        data: {},
        version: crypto.randomUUID(),
        state: null,
        state_expires_at: null,
      },
      {
        ...options,
        configuredClient: configuredClient ?? undefined,
        persisted: !!session,
      },
    );
  }

  /** Capture only the configured MCP endpoint's challenge, never request data
   * or credentials. The SDK validates metadata URLs during OAuth discovery. */
  fetch: typeof globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    const requestInit =
      input instanceof Request
        ? {
            method: input.method,
            headers: input.headers,
            body: input.body ? await input.arrayBuffer() : undefined,
            signal: input.signal,
            redirect: input.redirect,
            ...init,
          }
        : init;
    // Preserve the SDK's DNS-pinned fetch for discovered OAuth endpoints.
    // Only the explicitly configured MCP origin may target private hosts.
    const response = await fetchWithValidatedEndpoint({
      url,
      init: requestInit,
      trustedOrigin: new URL(this.session.server_url).origin,
      redirect: requestInit?.redirect === "manual" ? "manual" : "error",
    });
    if (url === this.session.server_url && response.status === 401) {
      const header = response.headers.get("www-authenticate") ?? "";
      const bearer = /^bearer\s/i.test(header);
      const metadata = bearer
        ? header.match(/(?:^|[,\s])resource_metadata="([^"]*)"/i)?.[1]
        : undefined;
      let resourceMetadataUrl: string | undefined;
      try {
        if (metadata) resourceMetadataUrl = new URL(metadata).href;
      } catch {}
      this.data.challenge = {
        resourceMetadataUrl,
        scope: bearer
          ? header.match(/(?:^|[,\s])scope="([^"]*)"/i)?.[1]
          : undefined,
      };
      this.data.clientVersion = this.configuredClient?.version;
      await this.save();
    }
    return response;
  };

  get authorizationOptions() {
    return {
      serverUrl: this.session.server_url,
      resourceMetadataUrl: this.data.challenge?.resourceMetadataUrl
        ? new URL(this.data.challenge.resourceMetadataUrl)
        : undefined,
      scope: this.data.challenge?.scope,
    };
  }

  async prepareLogin(options: {
    redirectUrl: string;
    returnTo: string;
    agentId: string;
    mcpId: string;
    activityId?: string;
    approvalId?: string;
  }) {
    if (this.data.redirectUrl !== options.redirectUrl) {
      this.data.client = undefined;
      this.data.authorizationServer = undefined;
    }
    this.session.state = null;
    this.session.state_expires_at = null;
    this.data = {
      ...this.data,
      ...options,
      clientVersion: this.configuredClient?.version,
      tokens: undefined,
      verifier: undefined,
    };
    await this.save();
  }

  private async save() {
    this.session = await saveMCPOAuthSession(
      {
        ...this.session,
        data: JSON.parse(
          JSON.stringify(this.data),
        ) as SupabaseDatabase["public"]["Tables"]["mcp_oauth_sessions"]["Row"]["data"],
      },
      this.persisted ? this.session.version : undefined,
      { supabase: this.supabase },
    );
    this.persisted = true;
  }

  get redirectUrl() {
    if (!this.data.redirectUrl) throw new MCPAuthorizationRequired(this.mcpId);
    return this.data.redirectUrl;
  }
  get clientMetadata() {
    return {
      client_name: "schorn.ai",
      redirect_uris: [this.redirectUrl],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    };
  }
  tokens() {
    return this.data.tokens;
  }
  async saveTokens(tokens: OAuthTokens) {
    this.data.tokens = {
      ...tokens,
      refresh_token: tokens.refresh_token ?? this.data.tokens?.refresh_token,
    };
    this.data.verifier = undefined;
    this.session.state = null;
    this.session.state_expires_at = null;
    await this.save();
  }
  clientInformation() {
    if (this.configuredClient)
      return {
        client_id: this.configuredClient.client_id,
        ...(this.configuredClient.client_secret
          ? { client_secret: this.configuredClient.client_secret }
          : {}),
      };
    if (!this.data.client && !this.interactive)
      throw new MCPAuthorizationRequired(this.mcpId);
    return this.data.client;
  }
  isClientInformationDynamicallyRegistered() {
    return !this.configuredClient;
  }
  async saveClientInformation(client: OAuthClientInformation) {
    this.data.client = client;
    await this.save();
  }
  authorizationServerInformation() {
    return this.data.authorizationServer;
  }
  async saveAuthorizationServerInformation(
    info: OAuthAuthorizationServerInformation,
  ) {
    this.data.authorizationServer = info;
    await this.save();
  }
  state() {
    if (!this.interactive) throw new MCPAuthorizationRequired(this.mcpId);
    return crypto.randomUUID();
  }
  async saveState(state: string) {
    this.session.state = state;
    this.session.state_expires_at = new Date(
      Date.now() + 10 * 60_000,
    ).toISOString();
    await this.save();
  }
  async saveCodeVerifier(verifier: string) {
    this.data.verifier = verifier;
    await this.save();
  }
  codeVerifier() {
    if (!this.data.verifier)
      throw new Error("Missing MCP authorization verifier");
    return this.data.verifier;
  }
  redirectToAuthorization(url: URL) {
    if (!this.interactive) throw new MCPAuthorizationRequired(this.mcpId);
    this.authorizationUrl = url;
  }
  async invalidateCredentials(
    scope: "all" | "client" | "tokens" | "verifier",
    context?: { tokens: OAuthTokens },
  ) {
    // The version predicate on save also protects against concurrent refreshes.
    if (
      context &&
      context.tokens.access_token !== this.data.tokens?.access_token
    )
      return;
    if (scope === "all" || scope === "tokens") this.data.tokens = undefined;
    if (scope === "all" || scope === "client") {
      this.data.client = undefined;
      this.data.authorizationServer = undefined;
    }
    if (scope === "all" || scope === "verifier") this.data.verifier = undefined;
    await this.save();
  }
  async useConfiguredClient(agentId: string, mcpId: string) {
    const configuredClient = await getMCPOAuthClient(
      agentId,
      mcpId,
      this.session.server_url,
      { supabase: this.supabase },
    );
    if (this.data.clientVersion !== configuredClient?.version)
      throw new Error(
        "MCP OAuth configuration changed. Reconnect from the chat.",
      );
    this.configuredClient = configuredClient ?? undefined;
  }
  get loginContext() {
    return {
      agentId: this.data.agentId,
      mcpId: this.data.mcpId,
      returnTo: this.data.returnTo,
      activityId: this.data.activityId,
      approvalId: this.data.approvalId,
    };
  }
}
