import type { Agent } from "@schornio/aibox-database/agent/_types";

export function getReasoning(
  setting: Agent["modelThinking"],
  user: boolean = false,
) {
  switch (setting) {
    case "mandatory-off":
      return "none";
    case "mandatory-on":
      return "high";
    case "optional-off":
    case "optional-on":
      return user ? "high" : "none";
  }
}
