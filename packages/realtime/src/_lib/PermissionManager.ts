export type Permission = "read" | "read_write";

export type PermissionManager = {
  getActivityAccess?(activityId: string): Promise<Permission | undefined>;
  getTaskQueueAccess?(): Promise<Permission | undefined>;
};

export type UserRealtimeProviderToken = `User ${string}`;
export type ServerRealtimeProviderToken = `Worker ${string}`;
export type WorkerRealtimeProviderToken = `Worker ${string}`;
