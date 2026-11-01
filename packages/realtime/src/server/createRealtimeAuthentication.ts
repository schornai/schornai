import type { Extension } from "@hocuspocus/server";
import { timingSafeEqual } from "node:crypto";

export type UserDocumentAuthorization = {
  permission: "read" | "read_write";
  expiresAt: number;
};

export type AuthenticationContext = {
  authorization: {
    token: string;
    worker: boolean;
    serviceId?: string;
    expiresAt: number;
    timer?: ReturnType<typeof setTimeout>;
    expiryTimer?: ReturnType<typeof setTimeout>;
    closed?: boolean;
  };
};

/** Authenticate every document subscription, including on multiplexed sockets. */
export function createRealtimeAuthentication({
  secret,
  authorizeUser,
  serviceSecret,
}: {
  secret: string;
  serviceSecret?: string;
  authorizeUser: (
    token: string,
    documentName: string,
  ) => Promise<UserDocumentAuthorization | undefined>;
}): Extension<AuthenticationContext> {
  if (secret.length < 32 || /\s/.test(secret)) {
    throw new Error("Invalid realtime server secret");
  }
  const expectedWorkerToken = Buffer.from(`Worker ${secret}`);
  const unauthorized = () => new Error("Unauthorized");

  async function authenticate(token: string, documentName: string) {
    if (!token || token.length > 16_384 || documentName.length > 256)
      throw unauthorized();
    const incoming = Buffer.from(token);
    const machine = /^Service ([0-9a-fA-F-]{36}) (\S+)$/.exec(token);
    if (
      machine &&
      serviceSecret &&
      serviceSecret.length >= 32 &&
      !/\s/.test(serviceSecret)
    ) {
      const credential = Buffer.from(machine[2]!);
      const expected = Buffer.from(serviceSecret);
      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          machine[1]!,
        ) &&
        credential.length === expected.length &&
        timingSafeEqual(credential, expected) &&
        ["artifactCatalog", "services"].includes(documentName)
      ) {
        return {
          permission: "read" as const,
          expiresAt: Infinity,
          worker: false,
          serviceId: machine[1]!.toLowerCase(),
        };
      }
      throw unauthorized();
    }
    if (
      incoming.length === expectedWorkerToken.length &&
      timingSafeEqual(incoming, expectedWorkerToken)
    ) {
      return {
        permission: "read_write" as const,
        expiresAt: Infinity,
        worker: true,
      };
    }
    if (!token.startsWith("User ") || /\s/.test(token.slice(5)))
      throw unauthorized();
    const result = await authorizeUser(token.slice(5), documentName).catch(
      () => undefined,
    );
    if (
      !result ||
      !Number.isFinite(result.expiresAt) ||
      result.expiresAt <= Date.now()
    )
      throw unauthorized();
    return { ...result, worker: false };
  }

  return {
    async onAuthenticate({ token, documentName, connectionConfig }) {
      connectionConfig.readOnly = true;
      const result = await authenticate(token, documentName);
      connectionConfig.readOnly = result.permission !== "read_write";
      return {
        authorization: {
          token,
          worker: result.worker,
          expiresAt: result.expiresAt,
          serviceId: "serviceId" in result ? result.serviceId : undefined,
        },
      } satisfies AuthenticationContext;
    },
    async connected({ context, connection, documentName }) {
      const authorization = context.authorization;
      if (authorization.worker || authorization.serviceId) return;
      // Keep expiry independent of network revalidation, which can stall.
      authorization.expiryTimer = setTimeout(
        () => {
          connection.close({ code: 4401, reason: "Unauthorized" });
        },
        Math.max(
          1,
          Math.min(2_147_483_647, authorization.expiresAt - Date.now()),
        ),
      );
      authorization.expiryTimer.unref();
      const schedule = () => {
        // Bound revoked-account/ACL exposure, and disconnect at JWT expiry even
        // when the client only listens and never sends another update.
        authorization.timer = setTimeout(
          async () => {
            try {
              const result = await authenticate(
                authorization.token,
                documentName,
              );
              if (authorization.closed) return;
              authorization.expiresAt = result.expiresAt;
              connection.readOnly = result.permission !== "read_write";
              schedule();
            } catch {
              connection.close({ code: 4401, reason: "Unauthorized" });
            }
          },
          Math.max(1, Math.min(60_000, authorization.expiresAt - Date.now())),
        );
        authorization.timer.unref();
      };
      schedule();
    },
    async beforeHandleMessage({ context }) {
      if (
        !context.authorization ||
        context.authorization.expiresAt <= Date.now()
      )
        throw unauthorized();
    },
    async onTokenSync() {
      // Reconnect to authenticate the refreshed token and update all connection
      // permissions together, rather than retaining the old authorization.
      throw unauthorized();
    },
    async onDisconnect({ context }) {
      if (context.authorization) context.authorization.closed = true;
      clearTimeout(context.authorization?.timer);
      clearTimeout(context.authorization?.expiryTimer);
    },
  };
}
