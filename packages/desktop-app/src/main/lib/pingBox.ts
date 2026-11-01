import { Agent, buildConnector, fetch } from "undici";

const TIMEOUT = 2000;

export async function pingBox(hostname: string) {
  const connector = buildConnector({ rejectUnauthorized: false });

  const abortController = new AbortController();
  setTimeout(() => {
    abortController.abort();
  }, TIMEOUT);

  const certificateFingerprint256Promise = Promise.withResolvers<string>();
  const responsePromise = fetch(`https://${hostname}/api/box/hello`, {
    dispatcher: new Agent({
      connect(options, callback) {
        connector(options, (error, socket) => {
          if (error) {
            callback(error, null);
            return;
          }

          if (socket && "getPeerCertificate" in socket) {
            const certificate = socket.getPeerCertificate(true);
            certificateFingerprint256Promise.resolve(
              certificate.fingerprint256,
            );
          } else {
            certificateFingerprint256Promise.reject();
          }

          callback(null, socket);
        });
      },
    }),
    signal: abortController.signal,
  });

  try {
    const [certificateFingerprint256, response] = await Promise.all([
      certificateFingerprint256Promise.promise,
      responsePromise,
    ]);

    const data = await response.json();

    if (
      data &&
      typeof data === "object" &&
      "id" in data &&
      typeof data.id === "string" &&
      data.id === "box-1"
    ) {
      return {
        data: {
          certificateFingerprint256,
          hostname,
        } satisfies BoxEndpoint,
      };
    } else {
      return {
        error: true,
        hostname,
        message: `Invalid response: ${JSON.stringify(data)}`,
      };
    }
  } catch (error) {
    return { error: true, hostname, message: String(error) };
  }
}
