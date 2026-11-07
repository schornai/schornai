import {
  platformInvocationLevel,
  type PlatformApprovalPolicy,
  type PlatformApprovalMode,
} from "@schornio/aibox-database/mcp/platformAgentPolicy";
import { z } from "zod";
import type { $ZodType } from "zod/v4/core";
import { parse } from "zod/v4/core";
import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";
import type { UserClaims } from "@schornio/aibox-database/auth/_types";
import {
  includesPlatformAccess,
  requirePlatformAccess,
  type PlatformAccessLevel,
} from "@schornio/aibox-database/mcp/platformAccess";
import type { ServerRealtimeWebsocketProvider } from "../server/ServerRealtimeWebsocketProvider.ts";

export type PlatformContext = {
  getSsoConfig?: () => import("@schornio/aibox-database/sso/_types").ServiceRoleConfig;
  approvals?: PlatformApprovalPolicy;
  userId: string;
  claims: UserClaims;
  level: PlatformAccessLevel;
  supabase: SupabaseClient;
  /** Server-only; tool handlers must authorize the exact resource before use. */
  supabaseServiceRole: SupabaseClient;
  serverToken: `Worker ${string}`;
  websocketProvider: ServerRealtimeWebsocketProvider;
};
export type PlatformTool = {
  name: string;
  description: string;
  level: PlatformAccessLevel;
  readOnly: boolean;
  inputSchema: Record<string, unknown>;
  approval?: (input: unknown) => PlatformApprovalMode;
  execute: (input: unknown) => Promise<unknown>;
};

export function platformRegistry(context: PlatformContext) {
  const tools: PlatformTool[] = [];
  function add<T>(
    name: string,
    description: string,
    level: PlatformAccessLevel,
    readOnly: boolean,
    schema: $ZodType<T>,
    run: (input: T) => Promise<unknown>,
  ) {
    if (
      context.approvals?.[level] === "off" ||
      !includesPlatformAccess(context.level, level)
    )
      return;
    try {
      requirePlatformAccess(context.claims, context.level, level);
    } catch {
      return;
    }
    tools.push({
      name,
      description,
      level,
      readOnly,
      inputSchema: z.toJSONSchema(schema, { io: "input" }),
      approval: context.approvals
        ? (input) => {
            const mode =
              context.approvals![
                platformInvocationLevel(name, level, input, context.userId)
              ];
            // An agent must not automatically grant another pending approval.
            if (
              mode !== "off" &&
              name === "platform_chat_tool_approval" &&
              input &&
              typeof input === "object" &&
              "approved" in input &&
              input.approved === true
            )
              return "ask";
            return mode;
          }
        : undefined,
      execute: async (raw) => {
        const required = platformInvocationLevel(
          name,
          level,
          raw,
          context.userId,
        );
        if (context.approvals?.[required] === "off")
          throw new Error("PLATFORM_TOOL_DISABLED");
        requirePlatformAccess(context.claims, context.level, required);
        requirePlatformAccess(context.claims, context.level, level);
        const input = parse(schema, raw);
        return await run(input);
      },
    });
  }
  function workspace(level: PlatformAccessLevel, id: string) {
    if (!id) throw new Error("NOT_AUTHORIZED");
    requirePlatformAccess(context.claims, context.level, level, id);
  }
  return { tools, add, workspace };
}
