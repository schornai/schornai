import type { DocumentName } from "../_lib/DocumentName.ts";
import { HocuspocusProvider } from "@hocuspocus/provider";
import type { ServerRealtimeProviderToken } from "../_lib/PermissionManager.ts";
import type { ServerRealtimeWebsocketProvider } from "./ServerRealtimeWebsocketProvider.ts";
import { Doc as YDoc } from "yjs";
import { waitForProviderSynced } from "../_lib/waitForProviderSynced.ts";

export class ServerRealtimeProvider {
  document: YDoc;
  provider: HocuspocusProvider;
  disposalAbortSignal?: AbortSignal;

  static getServerToken(secret: string) {
    return `Worker ${secret}` satisfies ServerRealtimeProviderToken;
  }

  constructor({
    documentName,
    serverToken,
    websocketProvider,
    disposalAbortSignal,
  }: {
    documentName: DocumentName;
    serverToken: ServerRealtimeProviderToken;
    websocketProvider: ServerRealtimeWebsocketProvider;
    disposalAbortSignal?: AbortSignal;
  }) {
    this.disposalAbortSignal = disposalAbortSignal;
    this.document = new YDoc();
    this.provider = new HocuspocusProvider({
      document: this.document,
      name: documentName,
      sessionAwareness: true,
      token: serverToken,
      websocketProvider: websocketProvider.websocketProvider,
    });
    this.provider.attach();
  }

  async waitForSynced(config?: { abortSignal: AbortSignal }) {
    return waitForProviderSynced(this.provider, config);
  }

  async [Symbol.asyncDispose]() {
    try {
      await this.waitForSynced({
        abortSignal: this.disposalAbortSignal ?? AbortSignal.timeout(30_000),
      });
    } finally {
      try {
        this.provider.destroy();
      } finally {
        this.document.destroy();
      }
    }
  }
}

export class ServerBatchRealtimeProvider {
  documents: YDoc[];
  #providers: ServerRealtimeProvider[];

  constructor({
    documentNames,
    serverToken,
    websocketProvider,
    disposalAbortSignal,
  }: {
    documentNames: DocumentName[];
    serverToken: ServerRealtimeProviderToken;
    websocketProvider: ServerRealtimeWebsocketProvider;
    disposalAbortSignal?: AbortSignal;
  }) {
    this.#providers = documentNames.map(
      (documentName) =>
        new ServerRealtimeProvider({
          documentName,
          serverToken,
          websocketProvider,
          disposalAbortSignal,
        }),
    );
    this.documents = this.#providers.map((provider) => provider.document);
  }

  batch<T extends Array<unknown>>(
    fn: (doc: YDoc, ...args: T) => void,
    ...args: T
  ) {
    for (const document of this.documents) {
      fn(document, ...args);
    }
  }

  async waitForSynced(config?: { abortSignal: AbortSignal }) {
    await Promise.all(
      this.#providers.map((provider) => provider.waitForSynced(config)),
    );
  }

  async [Symbol.asyncDispose]() {
    const results = await Promise.allSettled(
      this.#providers.map((provider) => provider[Symbol.asyncDispose]()),
    );
    const errors = results
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason);
    if (errors.length)
      throw new AggregateError(errors, "Realtime cleanup failed");
  }
}
