import { HocuspocusProviderWebsocket } from "@hocuspocus/provider";

export class ServerRealtimeWebsocketProvider {
  websocketProvider: HocuspocusProviderWebsocket;
  static websocketProviders: Map<string, HocuspocusProviderWebsocket> =
    new Map();

  constructor(
    config = {
      environmentKeys: {
        serverUrl: "REALTIME_SERVER_URL",
      },
    },
  ) {
    const url = process.env[config.environmentKeys.serverUrl];
    if (!url || url.length === 0) {
      throw new Error(
        `Environment variable "${config.environmentKeys.serverUrl}" not set.`,
      );
    }

    const websocketProviderByUrl =
      ServerRealtimeWebsocketProvider.websocketProviders.get(url);

    if (websocketProviderByUrl) {
      this.websocketProvider = websocketProviderByUrl;
    } else {
      const newWebsocketProvider = new HocuspocusProviderWebsocket({
        url,
      });
      ServerRealtimeWebsocketProvider.websocketProviders.set(
        url,
        newWebsocketProvider,
      );
      this.websocketProvider = newWebsocketProvider;
    }
  }
}
