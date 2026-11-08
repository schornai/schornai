import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type {
  ToolCalculator,
  ToolChatSetLabel,
  ToolChatResponseSuggestions,
  ToolChatCurrentDateTime,
} from "@schornio/aibox-database/chat/_types";
import type { Agent } from "@schornio/aibox-database/agent/_types";
import { calculate } from "@schornio/aibox-realtime/tools/calculate";
import { currentDateTime } from "@schornio/aibox-realtime/tools/currentDateTime";
import { setActivityLabel } from "@schornio/aibox-realtime/documents/activity/setActivityLabel";
import { getActivitiesDocumentName } from "@schornio/aibox-realtime/documents/activity/_utils";
import { ServerRealtimeProvider } from "@schornio/aibox-realtime/server/ServerRealtimeProvider";
import type { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";

export function supportTools(
  role: Agent["roles"][number],
  context: {
    userId: string;
    activityId: string;
    serverToken: `Worker ${string}`;
    websocketProvider: ServerRealtimeWebsocketProvider;
  },
): ToolSet {
  const tools: ToolSet = {};
  if (role.toolCalculator?.active)
    tools.calculator = tool({
      description:
        "Calculate a numeric expression. Supports + - * / ^ % mod, parentheses, pi, e; sqrt, sin/cos/tan and inverses (radians), ln (natural), log/log10 (base 10), log2, abs, floor, ceil, round, exp, pow, mod. sum/avg/min/max accept lists or arrays: avg(2;4;5), sum([1,2,3]). Commas and semicolons separate arguments; decimals use a dot. Finite real numbers only; maximum 2000 characters.",
      inputSchema: z.object({ expression: z.string().min(1).max(2000) }),
      async execute({ expression }): Promise<ToolCalculator["output"]> {
        try {
          return { ok: true, expression, result: calculate(expression) };
        } catch {
          return {
            ok: false,
            error:
              "Invalid or unsupported expression, excessive complexity, or non-finite result. Check the calculator syntax and numeric domain.",
          };
        }
      },
    });
  const chat = role.toolChatAwareness;
  if (!chat?.active) return tools;
  if (chat.currentDateTime)
    tools["chat-current-date-time"] = tool({
      description:
        "Read the current date and time. Pass an IANA time zone such as Europe/Vienna if known; otherwise UTC is used. Never infer the user's time zone from the server.",
      inputSchema: z.object({ timeZone: z.string().max(100).optional() }),
      async execute({ timeZone }): Promise<ToolChatCurrentDateTime["output"]> {
        try {
          return { ok: true, ...currentDateTime(timeZone) };
        } catch {
          return { ok: false, error: "Invalid IANA time zone." };
        }
      },
    });
  if (chat.recommendNextMessages)
    tools["chat-response-suggestions"] = tool({
      description:
        "Offer 2–8 short suggested replies for the user to choose from. These are optional editable drafts, never user messages or approvals. You may also write a normal message. Call once with all suggestions; the latest call replaces earlier suggestions for this turn.",
      inputSchema: z.object({
        suggestions: z
          .array(z.string().trim().min(1).max(500))
          .min(2)
          .max(8)
          .refine(
            (values) => new Set(values).size >= 2,
            "Provide at least two distinct suggestions.",
          ),
      }),
      async execute({
        suggestions,
      }): Promise<ToolChatResponseSuggestions["output"]> {
        return { ok: true, suggestions: [...new Set(suggestions)] };
      },
    });
  if (chat.updateChatLabel)
    tools["chat-set-label"] = tool({
      description:
        "Give this chat a short descriptive activity title. A title manually set by the user is preserved.",
      inputSchema: z.object({ label: z.string().trim().min(1).max(500) }),
      async execute(
        { label },
        { abortSignal },
      ): Promise<ToolChatSetLabel["output"]> {
        await using provider = new ServerRealtimeProvider({
          documentName: getActivitiesDocumentName({ userId: context.userId }),
          serverToken: context.serverToken,
          websocketProvider: context.websocketProvider,
        });
        await provider.waitForSynced({
          abortSignal: abortSignal ?? AbortSignal.timeout(30_000),
        });
        abortSignal?.throwIfAborted();
        const result = setActivityLabel(
          provider.document,
          context.activityId,
          label,
          true,
        );
        await provider.waitForSynced({
          abortSignal: abortSignal ?? AbortSignal.timeout(30_000),
        });
        return { ok: true, ...result };
      },
    });
  return tools;
}
