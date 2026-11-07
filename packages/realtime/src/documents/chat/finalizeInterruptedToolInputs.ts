import { isToolUIPart } from "ai";
import type { ChatMessage } from "@schornio/aibox-package-database/chat/_types";

/** Only call after generation has ended, or on history before a new generation. */
export function finalizeInterruptedToolInputs(
  message: ChatMessage,
): ChatMessage {
  if (message.role !== "assistant") return message;
  const interruptedSteps = new Set<number>();
  let step = 0;
  for (const part of message.parts) {
    if (part.type === "step-start") step++;
    if (isToolUIPart(part) && part.state === "input-streaming")
      interruptedSteps.add(step);
  }
  if (!interruptedSteps.size) return message;
  step = 0;
  return {
    ...message,
    parts: message.parts.flatMap((part): ChatMessage["parts"] => {
      if (part.type === "step-start") step++;
      // An interrupted response may contain reasoning IDs that the provider
      // never committed. Keep completed steps, but never replay this reasoning.
      if (
        interruptedSteps.has(step) &&
        (part.type === "reasoning" || part.type === "reasoning-file")
      )
        return [];
      if (isToolUIPart(part) && part.state === "input-streaming") {
        return [
          {
            ...part,
            state: "output-error",
            // Typed tool inputs must be complete. Retain the unfinished payload
            // only as raw diagnostic input, never as executable arguments.
            input: undefined,
            rawInput: part.rawInput ?? part.input,
            errorText:
              "TOOL_INPUT_INTERRUPTED: Input generation ended before this tool could be called. The tool was not executed. Generate a new, complete call if still needed.",
            callProviderMetadata: undefined,
          } as Extract<ChatMessage["parts"][number], { state: "output-error" }>,
        ];
      }
      return [part];
    }),
  };
}
