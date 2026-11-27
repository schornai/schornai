import type { TranscriberConfigurationIssue } from "@schornio/aibox-package-database/transcriber/requireTranscriber";

export type VoiceTranscriberStatus =
  "ready" | TranscriberConfigurationIssue | "TRANSCRIBER_CHECK_FAILED";

export const voiceTranscriberErrorKeys = {
  TRANSCRIBER_REQUIRED: "errorTranscriberRequired",
  TRANSCRIBER_NOT_FOUND: "errorTranscriberNotFound",
  TRANSCRIBER_MODEL_MISSING: "errorTranscriberModel",
  TRANSCRIBER_CHECK_FAILED: "errorTranscriberCheck",
} as const satisfies Record<Exclude<VoiceTranscriberStatus, "ready">, string>;
