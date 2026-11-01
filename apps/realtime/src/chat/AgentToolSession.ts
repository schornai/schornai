import { getConnectionCredentials } from "@schornio/aibox-database/connections/getConnectionCredentials";
import {
  storageTransferFileTool,
  storageTransferFileToolApproval,
} from "./tools/documentRepository/storageTransferFile.ts";
import type { UserClaims } from "@schornio/aibox-database/auth/_types";
/* eslint-disable sort-keys */
import type { ToolApprovalConfiguration, ToolSet } from "ai";
import {
  storageWriteFileTool,
  storageWriteFileToolApproval,
} from "./tools/documentRepository/storageWriteFile.ts";
import type { Agent } from "@schornio/aibox-database/agent/_types";
import { MCPToolSession } from "./MCPToolSession.ts";
import type { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";
import { getDocumentRepositorityByIdentifiers } from "@schornio/aibox-database/documentRepositories/getDocumentRepositorityByIdentifiers";
import { storageListTool } from "./tools/documentRepository/storageList.ts";
import { storageReadFiletTool } from "./tools/documentRepository/storageReadFile.ts";
import { storageSearchTool } from "./tools/documentRepository/storageSearch.ts";

import {
  webFetchTool,
  webFetchToolApproval,
  type WebFetchContext,
} from "./tools/web/webFetch.ts";
import { webSearchTool } from "./tools/web/webSearch.ts";

type AgentRole = Agent["roles"][number];

export class AgentToolSession {
  #userId: string;
  #userClaims: UserClaims;
  #activityId: string;
  #agentId: string;
  #mcp: MCPToolSession;
  #mountedDocumentRepositoriesPromise: ReturnType<
    typeof getDocumentRepositorityByIdentifiers
  >;
  #role: AgentRole;
  #serverToken: `Worker ${string}`;
  #supabase: SupabaseClient;
  #supabaseServiceRole: SupabaseClient;
  #websocketProvider: ServerRealtimeWebsocketProvider;

  constructor(
    activityId: string,
    agentId: string,
    role: AgentRole,
    {
      abortSignal,
      userId,
      userClaims,
      serverToken,
      supabase,
      supabaseServiceRole,
      websocketProvider,
    }: {
      abortSignal: AbortSignal;
      userId: string;
      userClaims: UserClaims;
      serverToken: `Worker ${string}`;
      supabase: SupabaseClient;
      supabaseServiceRole: SupabaseClient;
      websocketProvider: ServerRealtimeWebsocketProvider;
    },
  ) {
    this.#userId = userId;
    this.#userClaims = userClaims;
    this.#activityId = activityId;
    this.#agentId = agentId;
    this.#role = role;
    this.#serverToken = serverToken;
    this.#supabase = supabase;
    this.#supabaseServiceRole = supabaseServiceRole;
    this.#websocketProvider = websocketProvider;

    this.#mcp = new MCPToolSession(
      role.mcps ?? [],
      userId,
      supabaseServiceRole,
      agentId,
      abortSignal,
    );

    this.#mountedDocumentRepositoriesPromise = (async () => {
      return role.documentRepositoryMounts.length > 0
        ? await getDocumentRepositorityByIdentifiers(
            role.documentRepositoryMounts.map(
              (mount) => mount.documentRepositoryIdentifier,
            ),
            {
              abortSignal,
              supabase,
            },
          )
        : [];
    })();
  }

  async tools(): Promise<ToolSet> {
    const mountedDocumentRepositories =
      await this.#mountedDocumentRepositoriesPromise;

    const web = this.#role.toolWebAccess;
    const fetchEnabled =
      web?.active && ["on", "ask"].includes(web.webFetch ?? "off");
    const documentRepositoryTools: ToolSet =
      this.#role.documentRepositoryMounts.length > 0 || fetchEnabled
        ? {
            "storage-list": storageListTool(
              this.#activityId,
              this.#agentId,
              this.#role.documentRepositoryMounts,
              mountedDocumentRepositories,
              { supabase: this.#supabase },
            ),
            "storage-read-file": storageReadFiletTool(
              this.#activityId,
              this.#agentId,
              this.#role.documentRepositoryMounts,
              mountedDocumentRepositories,
              { supabase: this.#supabase },
            ),
            ...(this.#role.documentRepositoryMounts.length > 0
              ? {
                  "storage-write-file": storageWriteFileTool(
                    this.#activityId,
                    this.#agentId,
                    this.#role.documentRepositoryMounts,
                    mountedDocumentRepositories,
                    {
                      serverToken: this.#serverToken,
                      supabase: this.#supabase,
                      websocketProvider: this.#websocketProvider,
                    },
                  ),
                  "storage-copy-file": storageTransferFileTool(
                    false,
                    {
                      activityId: this.#activityId,
                      agentId: this.#agentId,
                      mounts: this.#role.documentRepositoryMounts,
                      mountedDocumentRepositories,
                    },
                    {
                      authenticatedUser: {
                        userId: this.#userId,
                        userClaims: this.#userClaims,
                      },
                      serverToken: this.#serverToken,
                      supabase: this.#supabase,
                      websocketProvider: this.#websocketProvider,
                    },
                  ),
                  "storage-move-file": storageTransferFileTool(
                    true,
                    {
                      activityId: this.#activityId,
                      agentId: this.#agentId,
                      mounts: this.#role.documentRepositoryMounts,
                      mountedDocumentRepositories,
                    },
                    {
                      authenticatedUser: {
                        userId: this.#userId,
                        userClaims: this.#userClaims,
                      },
                      serverToken: this.#serverToken,
                      supabase: this.#supabase,
                      websocketProvider: this.#websocketProvider,
                    },
                  ),
                  "storage-search": storageSearchTool(
                    this.#role.documentRepositoryMounts,
                    mountedDocumentRepositories,
                    { supabase: this.#supabase },
                  ),
                }
              : {}),
          }
        : {};

    return {
      ...(this.#role.mcps?.length ? { mcp: this.#mcp.tool() } : {}),
      ...documentRepositoryTools,
      ...(fetchEnabled
        ? {
            "web-fetch": webFetchTool(
              web!,
              this.#webFetchContext(mountedDocumentRepositories),
            ),
          }
        : {}),
      ...(web?.active && ["on", "ask"].includes(web.webSearch ?? "off")
        ? {
            "web-search": webSearchTool(web, undefined, async () =>
              web.webSearchConnectionId
                ? getConnectionCredentials(web.webSearchConnectionId, {
                    supabase: this.#supabaseServiceRole,
                  })
                : null,
            ),
          }
        : {}),
    };
  }

  async toolApproval(): Promise<ToolApprovalConfiguration<ToolSet, unknown>> {
    const mountedDocumentRepositories =
      await this.#mountedDocumentRepositoriesPromise;
    return {
      ...(this.#role.mcps?.length ? { mcp: this.#mcp.approval } : {}),
      "web-fetch": this.#role.toolWebAccess
        ? webFetchToolApproval(
            this.#role.toolWebAccess,
            this.#webFetchContext(mountedDocumentRepositories),
          )
        : "approved",
      "web-search":
        this.#role.toolWebAccess?.webSearch === "ask"
          ? "user-approval"
          : "approved",
      "storage-copy-file": storageTransferFileToolApproval(false, {
        activityId: this.#activityId,
        agentId: this.#agentId,
        mounts: this.#role.documentRepositoryMounts,
        mountedDocumentRepositories,
      }),
      "storage-move-file": storageTransferFileToolApproval(true, {
        activityId: this.#activityId,
        agentId: this.#agentId,
        mounts: this.#role.documentRepositoryMounts,
        mountedDocumentRepositories,
      }),
      "storage-write-file": storageWriteFileToolApproval(
        this.#activityId,
        this.#agentId,
        this.#role.documentRepositoryMounts,
        mountedDocumentRepositories,
      ),
    };
  }

  #webFetchContext(
    mountedDocumentRepositories: WebFetchContext["mountedDocumentRepositories"],
  ): WebFetchContext {
    return {
      activityId: this.#activityId,
      agentId: this.#agentId,
      mounts: this.#role.documentRepositoryMounts,
      mountedDocumentRepositories,
      userId: this.#userId,
      userClaims: this.#userClaims,
      serverToken: this.#serverToken,
      supabase: this.#supabase,
      websocketProvider: this.#websocketProvider,
    };
  }

  async [Symbol.asyncDispose]() {
    await this.#mcp[Symbol.asyncDispose]();
  }
}
