import type { StorageRealtimeObject } from "../storage/_types.ts";

export type Message = {
  id: string;
  state: "queued" | "submitted" | "claimed" | "finished" | "paused";
  content:
    | {
        files?: StorageRealtimeObject[];
        type: "text";
        text: string;
        thinking?: boolean;
      }
    | {
        approvalId: string;
        approved: boolean;
        type: "tool-approval";
        thinking?: boolean;
      };
};

export type TextMessage = Message & {
  content: Extract<Message["content"], { type: "text" }>;
};
