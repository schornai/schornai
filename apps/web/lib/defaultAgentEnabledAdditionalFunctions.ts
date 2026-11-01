import type { Agent } from "@schornio/aibox-package-database/agent/_types";

export const defaultAgentEnabledAdditionalFunctions: Agent["additionalFunctions"] =
  {
    batch: true,
    disappearingChats: true,
    fileUpload: true,
    nightshift: true,
    pursueGoal: true,
  };
