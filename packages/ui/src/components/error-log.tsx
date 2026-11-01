import * as z from "zod/mini";

const LOCAL_STORAGE_KEY = "ai.schorn.aibox.package.ui.v1.error-logs";
const SERVER_SNAPSHOT: ErrorLog[] = [];

const errorLogSchema = z.object({
  date: z.coerce.date(),
  id: z.uuid(),
  hint: z.string(),
  message: z.string(),
  send: z.boolean(),
});

export type ErrorLog = z.infer<typeof errorLogSchema>;

const errorLogStorageSchema = z.object({
  errorLogs: z.array(errorLogSchema),
});

type ErrorLogStorage = z.infer<typeof errorLogStorageSchema>;

let errorLogStorageCache: ErrorLogStorage | undefined = undefined;

const listeners = new Set<() => void>();

export function getSnapshot(): ErrorLog[] {
  if (!globalThis.localStorage) {
    return SERVER_SNAPSHOT;
  }

  if (errorLogStorageCache) {
    return errorLogStorageCache.errorLogs;
  }

  try {
    const item = globalThis.localStorage.getItem(LOCAL_STORAGE_KEY);

    if (item) {
      const deserializedItem = JSON.parse(item) as unknown;
      const errorLogStorage = errorLogStorageSchema.parse(deserializedItem);
      errorLogStorageCache = errorLogStorage;
      return errorLogStorage.errorLogs;
    }

    errorLogStorageCache = { errorLogs: [] };
    return errorLogStorageCache.errorLogs;
  } catch (error) {
    const newErrorLogs = [
      {
        date: new Date(),
        id: crypto.randomUUID(),
        hint: "getSnapshot()",
        message: serializeError(
          new Error(`Serialization of "${LOCAL_STORAGE_KEY}" failed`, {
            cause: error,
          }),
        ),
        send: true,
      },
    ];

    const value: z.infer<typeof errorLogStorageSchema> = {
      errorLogs: newErrorLogs.slice(-100),
    };

    globalThis.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(value));
    errorLogStorageCache = undefined;

    return newErrorLogs;
  }
}

export function getServerSnapshot(): ErrorLog[] {
  return SERVER_SNAPSHOT;
}

function setSnapshot(errorLogs: ErrorLog[]) {
  if (!globalThis.localStorage) {
    return;
  }

  const value: z.infer<typeof errorLogStorageSchema> = {
    errorLogs: errorLogs.slice(-100),
  };
  globalThis.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(value));
  errorLogStorageCache = undefined;

  for (const listener of listeners) {
    listener();
  }
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emptyDefault(str: string | null | undefined, defaultStr: string) {
  if (str && str.length > 0) {
    return str;
  }
  return defaultStr;
}

function serializeError(
  error: unknown,
  maxDepth = 10,
  seen = new WeakSet<Error>(),
): string {
  if (maxDepth === 0) {
    return "[Max Depth]";
  }

  if (error instanceof Error) {
    if (seen.has(error)) {
      return "[Circular Reference]";
    }
    seen.add(error);

    return (
      `Error: ${emptyDefault(error.name, "[Empty Name]")}\n\n` +
      `Message:\n${emptyDefault(error.message, "[Empty Message]")}\n\n` +
      `Stack:\n${emptyDefault(error.stack, "[Empty Stack]")}\n\n` +
      `Cause:\n${error.cause ? `\n---\n${serializeError(error.cause, maxDepth - 1, seen)}` : "[Empty Cause]"}`
    );
  }

  try {
    return JSON.stringify({ errorObject: error }, null, 2);
  } catch {
    return `[Not Serializable] "${String(error)}"`;
  }
}

export function logError(hint: string, error: unknown) {
  console.error("logError", hint, error);
  const errorLogs = [...getSnapshot()];
  errorLogs.push({
    date: new Date(performance.timeOrigin + performance.now()),
    hint,
    id: crypto.randomUUID(),
    message: serializeError(error),
    send: true,
  });
  setSnapshot(errorLogs);
}

export function setSendError(errorLogId: string, send: boolean) {
  const errorLogs = [...getSnapshot()];
  setSnapshot(
    errorLogs.map((errorLog) =>
      errorLog.id === errorLogId ? { ...errorLog, send } : errorLog,
    ),
  );
}

export function setSendErrors(send: boolean) {
  const errorLogs = [...getSnapshot()];
  setSnapshot(errorLogs.map((errorLog) => ({ ...errorLog, send })));
}

export function deleteErrors() {
  setSnapshot([]);
}
