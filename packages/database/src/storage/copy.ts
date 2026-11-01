import {
  MDC_FILE_EXTENSION,
  TRANSCRIPT_FILE_EXTENSION,
} from "./_utils/toStorageObjectArray.ts";
import type { StorageObject } from "./_types.ts";
import type { StorageRealtimeSession } from "./_types.ts";
import { inspect } from "./inspect.ts";
import { list } from "./list.ts";

async function copyFile(
  from: {
    storageSession: StorageRealtimeSession;
    target: Extract<StorageObject, { file: true }>;
  },
  to: {
    storageSession: StorageRealtimeSession;
    targetFolder: Extract<StorageObject, { folder: true }>;
  },
) {
  const { storagePath: storagePathFrom } = from.storageSession.getStoragePath(
    from.target.path,
  );

  const { resolvedPath: resolvedPathTo, storagePath: storagePathTo } =
    to.storageSession.getStoragePath(
      `${to.targetFolder.path}/${from.target.name}`,
    );

  const destinationBucket =
    from.storageSession.storageName !== to.storageSession.storageName
      ? to.storageSession.storageName
      : undefined;

  from.storageSession.abortSignal?.throwIfAborted();
  to.storageSession.abortSignal?.throwIfAborted();
  const { error } = await from.storageSession.supabaseStorage.copy(
    storagePathFrom,
    storagePathTo,
    {
      destinationBucket,
    },
  );

  const nowISO = new Date().toISOString();
  const target: StorageObject = {
    createdAtISO: nowISO,
    file: true,
    name: from.target.name,
    path: resolvedPathTo,
    readableContent: from.target.readableContent,
    size: from.target.size,
    type: from.target.type,
    updatedAtISO: nowISO,
  };

  if (error) {
    from.storageSession.logAction({
      message: error.message,
      state: "error",
      target,
    });
  } else {
    switch (from.target.readableContent) {
      case "text": {
        await from.storageSession.supabaseStorage.copy(
          `${storagePathFrom}${MDC_FILE_EXTENSION}`,
          `${storagePathTo}${MDC_FILE_EXTENSION}`,
          {
            destinationBucket,
          },
        );
        break;
      }
      case "transcript": {
        await from.storageSession.supabaseStorage.copy(
          `${storagePathFrom}${TRANSCRIPT_FILE_EXTENSION}`,
          `${storagePathTo}${TRANSCRIPT_FILE_EXTENSION}`,
          {
            destinationBucket,
          },
        );
        break;
      }
    }

    to.storageSession.logAction({ state: "created", target });
  }
}

async function copyFolder(
  from: {
    storageSession: StorageRealtimeSession;
    target: Extract<StorageObject, { folder: true }>;
  },
  to: {
    storageSession: StorageRealtimeSession;
    targetFolder: Extract<StorageObject, { folder: true }>;
  },
) {
  const storageObjects = await list(from.target.path, from.storageSession);
  await Promise.all(
    storageObjects.map(async (storageObject) => {
      if (storageObject.file) {
        await copyFile(
          { storageSession: from.storageSession, target: storageObject },
          { storageSession: to.storageSession, targetFolder: to.targetFolder },
        );
      }

      if (storageObject.folder) {
        await copyFolder(
          {
            storageSession: from.storageSession,
            target: storageObject,
          },
          to,
        );
        to.storageSession.logAction({
          state: "created",
          target: to.targetFolder,
        });
      }
    }),
  );
}

export async function copy(
  from: { path: string; storageSession: StorageRealtimeSession },
  to: { path: string; storageSession: StorageRealtimeSession },
) {
  const [storageObjectFrom, storageObjectTo] = await Promise.all([
    inspect(from.path, from.storageSession),
    inspect(to.path, from.storageSession),
  ]);

  if (storageObjectTo?.folder) {
    if (storageObjectFrom?.file) {
      await copyFile(
        { storageSession: from.storageSession, target: storageObjectFrom },
        { storageSession: to.storageSession, targetFolder: storageObjectTo },
      );
    }

    if (storageObjectFrom?.folder) {
      return await copyFolder(
        { storageSession: from.storageSession, target: storageObjectFrom },
        { storageSession: to.storageSession, targetFolder: storageObjectTo },
      );
    }
  }

  throw new Error("NOT_FOUND");
}
