import type {
  StorageObjectAction,
  StorageRealtimeSession as StorageRealtimeSessionType,
} from "@schornio/aibox-database/storage/_types";
import type { Doc } from "yjs";
import { ServerRealtimeProvider } from "../../server/ServerRealtimeProvider.ts";
import type { ServerRealtimeProviderToken } from "../../_lib/PermissionManager.ts";
import type { ServerRealtimeWebsocketProvider } from "../../server/ServerRealtimeWebsocketProvider.ts";
import { StorageSession } from "@schornio/aibox-database/storage/_utils/StorageSession";
import { addStorageLog } from "./addStorageLog.ts";
import { getStorageDocumentName } from "./_utils.ts";

export class StorageRealtimeSession
  extends StorageSession
  implements StorageRealtimeSessionType
{
  #sessionId: string;
  #realtimeProvider: ServerRealtimeProvider;

  constructor({
    serverToken,
    websocketProvider,
    ...superParams
  }: {
    serverToken: ServerRealtimeProviderToken;
    websocketProvider: ServerRealtimeWebsocketProvider;
  } & ConstructorParameters<typeof StorageSession>[0]) {
    super(superParams);

    this.#sessionId = crypto.randomUUID();

    this.#realtimeProvider = new ServerRealtimeProvider({
      documentName: getStorageDocumentName(this.storage),
      serverToken,
      websocketProvider,
    });
  }

  static logAction(
    target: StorageObjectAction,
    document: Doc,
    sessionId: string = crypto.randomUUID(),
  ): void {
    addStorageLog(document, {
      ...target,
      sessionId,
    });
  }

  logAction(target: StorageObjectAction): void {
    StorageRealtimeSession.logAction(
      target,
      this.#realtimeProvider.document,
      this.#sessionId,
    );
  }

  async [Symbol.asyncDispose]() {
    await this.#realtimeProvider[Symbol.asyncDispose]();
  }
}
