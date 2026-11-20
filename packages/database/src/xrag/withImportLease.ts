import type { SupabaseClient } from "../_shared/_types.ts";
import { renewImport } from "./importTransaction.ts";

export async function withImportLease<T>(
  id: string,
  token: string,
  supabase: SupabaseClient,
  signal: AbortSignal | undefined,
  operation: (signal: AbortSignal) => Promise<T>,
) {
  const lost = new AbortController();
  const combined = signal
    ? AbortSignal.any([signal, lost.signal])
    : lost.signal;
  let renewing: Promise<void> | undefined;
  const timer = setInterval(() => {
    if (renewing) return;
    renewing = renewImport(id, token, supabase)
      .catch((error) => lost.abort(error))
      .finally(() => {
        renewing = undefined;
      });
  }, 30_000);
  try {
    combined.throwIfAborted();
    return await operation(combined);
  } finally {
    clearInterval(timer);
    await renewing;
  }
}
