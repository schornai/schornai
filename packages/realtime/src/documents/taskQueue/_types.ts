import type { LanguageModelCallOptions, ModelMessage } from "ai";
import type {
  LanguageModelV4DoGenerateResult,
  LanguageModelV4DoStreamParameters,
} from "../modelDoStream/_types.ts";
import type { EmbeddingModelV4DoEmbedParameters } from "../modelDoEmbed/_types.ts";
import type { Storage } from "@schornio/aibox-database/storage/_types";
import type { TranscriptionRetryLevel } from "@schornio/aibox-database/transcriber/_types";
import type { UserClaims } from "@schornio/aibox-database/auth/_types";

type TaskStatePending = {
  id: string;
  chat?: { activityId: string; agentId: string };

  requiredCapabilities: string[];

  state: "pending";
};

type TaskStateClaimed = Omit<TaskStatePending, "state"> & {
  state: "claimed";

  claimToken?: string;
  claimedBy: string;
  claimedAtISO: string;
};

type TaskStateFinished = Omit<TaskStateClaimed, "state"> & {
  state: "finished";

  finishedAtISO: string;
};

type TaskStateAborting = Omit<TaskStatePending, "state"> & {
  state: "aborting";

  abortingAtISO: string;
};

type TaskStateAborted = Omit<TaskStateAborting, "state"> & {
  state: "aborted";

  abortedAtISO: string;
};

type TaskStateError = (
  | (Omit<TaskStatePending, "state"> & {
      stateBeforeError: TaskStatePending["state"];
    })
  | (Omit<TaskStateClaimed, "state"> & {
      stateBeforeError: TaskStateClaimed["state"];
    })
  | (Omit<TaskStateFinished, "state"> & {
      stateBeforeError: TaskStateFinished["state"];
    })
  | (Omit<TaskStateAborting, "state"> & {
      stateBeforeError: TaskStateAborting["state"];
    })
  | (Omit<TaskStateAborted, "state"> & {
      stateBeforeError: TaskStateAborted["state"];
    })
) & {
  state: "error";
  error: string;
  finishedAtISO?: string;
};

export type TaskTypeChat = {
  type: "chat";

  parameters: {
    activityId: string;
    agentId: string;
    retry?: boolean;
    userClaims: UserClaims;
    userId: string;
  };

  result?: undefined;
};

// brauch ich das als eigenen task? doGenerate für alles!?
export type TaskTypeAgentSelectRole = {
  type: "agent-select-role";

  parameters: {
    messages: ModelMessage[];
    modelIdentifier: string;
    reasoning?: LanguageModelCallOptions["reasoning"];
    roles: { name: string; roleSelectionHint: string }[];
    userClaims: UserClaims;
  };

  result?: {
    roleName: string;
  };
};

export type TaskTypeModelDoGenerate = {
  type: "model-do-generate";

  parameters: { modelId: string } & LanguageModelV4DoStreamParameters;

  result: LanguageModelV4DoGenerateResult;
};

export type TaskTypeModelDoStream = {
  type: "model-do-stream";

  parameters: {
    modelDoStreamDocumentId: string;
    modelId: string;
  } & LanguageModelV4DoStreamParameters;

  result?: undefined;
};

export type TaskTypeModelDoEmbed = {
  type: "model-do-embed";

  parameters: {
    modelDoEmbedDocumentId: string;
    modelId: string;
  } & EmbeddingModelV4DoEmbedParameters;

  result?: undefined;
};

export type TaskTypeProcessFile = {
  type: "process-file";

  parameters: {
    reuseContent?: boolean;
    useSavedContent?: boolean;
    path: string;
    storage: Storage;

    userClaims: UserClaims;
    userId: string;
  };

  result?: undefined;
};

export type TaskTypeTranscribe = {
  type: "transcribe";

  parameters: {
    modelIdentifier: string;
    modelPrompt?: string;
    retryLevel?: TranscriptionRetryLevel;
    path: string;
    storage: Storage;
    userClaims: UserClaims;
    userId: string;
  };

  result?: undefined;
};

export type Task = (
  | TaskStatePending
  | TaskStateClaimed
  | TaskStateFinished
  | TaskStateAborting
  | TaskStateAborted
  | TaskStateError
) &
  (
    | TaskTypeChat
    | TaskTypeAgentSelectRole
    | TaskTypeModelDoGenerate
    | TaskTypeModelDoStream
    | TaskTypeModelDoEmbed
    | TaskTypeProcessFile
    | TaskTypeTranscribe
  );
