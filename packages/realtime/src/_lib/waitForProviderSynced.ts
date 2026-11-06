import type { HocuspocusProvider } from "@hocuspocus/provider";

// `isSynced` only records the initial handshake. Subsequent writes must also
// be acknowledged before starting a worker or destroying the provider.
export function waitForProviderSynced(
  provider: HocuspocusProvider,
  { abortSignal }: { abortSignal?: AbortSignal } = {},
) {
  return new Promise<void>((resolve, reject) => {
    abortSignal?.throwIfAborted();

    const cleanup = () => {
      clearTimeout(timer);
      provider.off("synced", check);
      provider.off("unsyncedChanges", check);
      provider.off("destroy", onDestroy);
      provider.off("authenticationFailed", onAuthenticationFailed);
      provider.off("close", onClose);
      abortSignal?.removeEventListener("abort", onAbort);
    };
    const check = () => {
      if (provider.isSynced && !provider.hasUnsyncedChanges) {
        cleanup();
        resolve();
      }
    };
    const onAbort = () => {
      cleanup();
      const reason: unknown = abortSignal?.reason;
      reject(
        reason instanceof Error
          ? reason
          : new DOMException(undefined, "AbortError"),
      );
    };
    const onDestroy = () => {
      cleanup();
      reject(new Error("Realtime provider destroyed before synchronization"));
    };
    const onAuthenticationFailed = () => {
      cleanup();
      reject(
        new Error("Realtime authentication failed before synchronization"),
      );
    };
    const onClose = () => {
      cleanup();
      reject(new Error("Realtime connection closed before synchronization"));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(
        new DOMException("Realtime synchronization timed out", "TimeoutError"),
      );
    }, 30_000);

    provider.on("synced", check);
    provider.on("unsyncedChanges", check);
    provider.on("destroy", onDestroy);
    provider.on("authenticationFailed", onAuthenticationFailed);
    provider.on("close", onClose);
    abortSignal?.addEventListener("abort", onAbort, { once: true });
    check();
  });
}
