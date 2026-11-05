import { vi } from "vitest";
import type {
  TaskClaim,
  TaskClaimOptions,
} from "../../packages/database/src/task/_types";

/** A shared durable store for coordinator/transport tests; SQL CAS is checked
 * separately against PostgreSQL, including concurrent transactions. */
export function taskClaimStore() {
  const records = new Map<string, TaskClaim>();
  let unavailable = false;
  const reply = (operation: () => unknown): any => ({
    abortSignal() {
      return this;
    },
    then(resolve: (value: unknown) => unknown) {
      return Promise.resolve(
        unavailable
          ? { error: new Error("unavailable") }
          : { data: operation(), error: null },
      ).then(resolve);
    },
  });
  const supabase = {
    rpc: vi.fn((name: string, args: any) =>
      reply(() => {
        const old = records.get(args?.p_task_id);
        if (name === "claim_background_task") {
          if (!old)
            records.set(args.p_task_id, {
              task_id: args.p_task_id,
              owner_token: args.p_owner_token,
              snapshot: args.p_snapshot,
              state: "claimed",
              expires_at: new Date(Date.now() + 90_000).toISOString(),
              completed_at: null,
              recovery_pending: false,
            });
          return [records.get(args.p_task_id)];
        }
        if (name === "expire_background_tasks") {
          const expired: TaskClaim[] = [];
          for (const record of records.values())
            if (
              record.state === "claimed" &&
              Date.parse(record.expires_at) <= Date.now()
            ) {
              Object.assign(record, {
                state: "error",
                completed_at: new Date().toISOString(),
                recovery_pending: true,
              });
              expired.push({ ...record });
            }
          return expired;
        }
        if (
          !old ||
          old.owner_token !== args.p_owner_token ||
          old.state !== "claimed" ||
          Date.parse(old.expires_at) <= Date.now()
        )
          return false;
        if (name === "renew_background_task") {
          old.expires_at = new Date(Date.now() + 90_000).toISOString();
          return true;
        }
        if (name === "finish_background_task") {
          Object.assign(old, {
            state: args.p_state,
            snapshot: args.p_snapshot,
            completed_at: new Date().toISOString(),
            recovery_pending: true,
          });
          return true;
        }
        throw new Error("Unexpected RPC: " + name);
      }),
    ),
    from: vi.fn((table: string) => {
      if (table !== "task_claims")
        throw new Error("Unexpected table: " + table);
      const filters: ((record: TaskClaim) => boolean)[] = [];
      let update: Partial<TaskClaim> | undefined;
      let limit = Infinity;
      const query: any = {
        select() {
          return query;
        },
        update(values: Partial<TaskClaim>) {
          update = values;
          return query;
        },
        eq(key: keyof TaskClaim, value: unknown) {
          filters.push((r) => r[key] === value);
          return query;
        },
        neq(key: keyof TaskClaim, value: unknown) {
          filters.push((r) => r[key] !== value);
          return query;
        },
        in(key: keyof TaskClaim, values: unknown[]) {
          filters.push((r) => values.includes(r[key]));
          return query;
        },
        order() {
          return query;
        },
        limit(count: number) {
          limit = count;
          return query;
        },
        abortSignal() {
          return query;
        },
        then(resolve: (value: unknown) => unknown) {
          return reply(() => {
            const selected = [...records.values()]
              .filter((r) => filters.every((f) => f(r)))
              .slice(0, limit);
            if (update) for (const row of selected) Object.assign(row, update);
            return selected.map((r) => ({ ...r }));
          }).then(resolve);
        },
      };
      return query;
    }),
  };
  return {
    records,
    supabase,
    options: { supabaseServiceRole: supabase } as unknown as TaskClaimOptions,
    setUnavailable(value: boolean) {
      unavailable = value;
    },
  };
}
