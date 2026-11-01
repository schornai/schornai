export type Activity = {
  content?:
    | { chatbotId: string; type: "chat" }
    | { type: "reindex" }
    | { transcriberId: string; type: "transcription" };
  createdAtISO: string;
  deleteAtISO?: string;
  id: string;
  label: string;
  labelUserInput: boolean;
  pinned: boolean;
  state: "idle" | "running" | "success" | "error";
  stateTimeoutISO?: string;
  updatedAtISO: string;
};
