import type {
  Storage,
  StorageObject,
  StorageObjectAction,
} from "@schornio/aibox-database/storage/_types";

export type StorageObjectLog = StorageObjectAction & {
  id: string;
  sessionId: string;
};

export type StorageRealtimeObject = StorageObject & {
  currentAction?: StorageObjectAction;
  attachment?: { storage: Storage; agentPath: string };
};
