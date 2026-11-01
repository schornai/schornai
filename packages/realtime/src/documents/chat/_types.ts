export type ChatState = { generationId?: string } & (
  | {
      type: "idle";
    }
  | {
      type: "queued";
    }
  | {
      type: "generating";
      claimedWorkerId: string;
      claimedAtISO: string;
    }
  | {
      type: "aborting";
    }
  | {
      type: "error";
      error: string;
    }
);
