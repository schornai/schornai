import {
  jsonSchema,
  tool,
  type ToolSet,
  type ToolApprovalConfiguration,
} from "ai";
import type { PlatformTool } from "./registry.ts";

export function platformAgentTools(definitions: PlatformTool[]): ToolSet {
  return Object.fromEntries(
    definitions.map((definition) => [
      definition.name,
      tool({
        description: definition.description,
        inputSchema: jsonSchema(definition.inputSchema),
        execute: async (input) => {
          try {
            return await definition.execute(input);
          } catch {
            throw new Error("PLATFORM_OPERATION_FAILED");
          }
        },
      }),
    ]),
  );
}
export function platformAgentApprovals(
  definitions: PlatformTool[],
): ToolApprovalConfiguration<ToolSet, unknown> {
  return Object.fromEntries(
    definitions.map((definition) => [
      definition.name,
      definition.approval
        ? (input: unknown) =>
            (
              ({
                auto: "approved",
                ask: "user-approval",
                off: "denied",
              }) as const
            )[definition.approval!(input)]
        : definition.readOnly
          ? "approved"
          : "user-approval",
    ]),
  );
}
