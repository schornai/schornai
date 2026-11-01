import type {
  SupabaseClient,
  SupabaseStorageAPI,
} from "../../_shared/_types.ts";
import { STORE_NAME as ACTIVITY_STORE_NAME } from "../../activity/_utils.ts";
import { STORE_NAME as DOCUMENT_REPOSITORY_STORE_NAME } from "../../documentRepositories/_utils.ts";
import { ExhaustiveError } from "@schornio/aibox-package-utils/ExhaustiveError";
import type { Storage } from "../_types.ts";
import { resolvePath } from "@schornio/aibox-package-utils/resolvePath";

export class StorageSession {
  #abortSignal: AbortSignal;
  #storage: Storage;
  #storageName: string;
  #supabaseStorage: SupabaseStorageAPI;

  constructor({
    abortSignal,
    storage,
    supabaseStorage,
  }: {
    abortSignal?: AbortSignal;
    storage: Storage;
    supabaseStorage: SupabaseClient["storage"];
  }) {
    this.#abortSignal = abortSignal ?? new AbortController().signal;
    this.#storage = storage;
    this.#storageName = StorageSession.getStorageName(storage.type);
    this.#supabaseStorage = supabaseStorage.from(this.#storageName);
  }

  get abortSignal() {
    return this.#abortSignal;
  }

  get storage() {
    return this.#storage;
  }

  get storageName() {
    return this.#storageName;
  }

  get supabaseStorage() {
    return this.#supabaseStorage;
  }

  static getStorageName(storageType: Storage["type"]) {
    switch (storageType) {
      case "activity":
      case "activity-transcription":
        return ACTIVITY_STORE_NAME;
      case "documentRepository":
        return DOCUMENT_REPOSITORY_STORE_NAME;
      default:
        throw new ExhaustiveError(storageType);
    }
  }

  static getStoragePath(path: string, storage: Storage) {
    const resolvedPath = resolvePath(path, { s3Compatible: true });
    switch (storage.type) {
      case "activity":
        return {
          resolvedPath,
          storagePath: resolvePath(
            `activity_chat___${storage.activityId}_${storage.agentId}/${resolvedPath}`,
          ),
        };
      case "activity-transcription":
        return {
          resolvedPath,
          storagePath: resolvePath(
            `activity_transcription__${storage.activityId}_${storage.transcriberId}/${resolvedPath}`,
          ),
        };
      case "documentRepository":
        return {
          resolvedPath,
          storagePath: `${storage.workspaceId ?? "not_set"}/${
            storage.documentRepositoryId
          }/${resolvedPath}`,
        };
      default:
        throw new ExhaustiveError(storage);
    }
  }

  getStoragePath(path: string) {
    return StorageSession.getStoragePath(path, this.#storage);
  }
}
