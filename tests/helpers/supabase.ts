import { vi } from "vitest";

export type Response = {
  data?: unknown;
  error?: unknown;
  count?: number | null;
};
/** A thenable query boundary. All filters and writes remain observable. */
export function query(response: Response = { data: [], error: null }) {
  const builder: Record<string, any> = {};
  for (const name of [
    "select",
    "insert",
    "update",
    "upsert",
    "delete",
    "eq",
    "neq",
    "in",
    "order",
    "limit",
    "range",
    "single",
    "maybeSingle",
    "abortSignal",
    "or",
    "match",
  ]) {
    builder[name] = vi.fn(() => builder);
  }
  builder.throwOnError = vi.fn(() => {
    if (response.error) return Promise.reject(response.error);
    return builder;
  });
  builder.then = (
    resolve: (value: Response) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve(response).then(resolve, reject);
  return builder;
}
export function database(responses: Record<string, Response> = {}) {
  const builders = Object.fromEntries(
    Object.entries(responses).map(([table, response]) => [
      table,
      query(response),
    ]),
  );
  const supabase = {
    from: vi.fn((table: string) => (builders[table] ??= query())),
    rpc: vi.fn(() => query()),
  };
  return { supabase, builders };
}
