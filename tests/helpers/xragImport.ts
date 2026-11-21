import { vi } from "vitest";
import { query } from "./supabase.ts";

/** In-memory Storage and transaction protocol for import fault injection. */
export function importBackend() {
  const objects = new Map<string, Buffer>();
  const jobs = new Map<string, any>();
  const prepared = new Map<string, any>();
  let commitFailure: "before" | "after" | undefined;
  const upload = vi.fn(
    async (bucket: string, path: string, body: AsyncIterable<Buffer>) => {
      const chunks: Buffer[] = [];
      for await (const chunk of body) chunks.push(chunk);
      objects.set(`${bucket}/${path}`, Buffer.concat(chunks));
      return { data: {}, error: null as unknown };
    },
  );
  const copy = vi.fn(
    async (bucket: string, from: string, to: string, destination: string) => {
      const source = objects.get(`${bucket}/${from}`);
      if (!source) return { error: new Error("missing source") };
      objects.set(`${destination}/${to}`, source);
      return { error: null as unknown };
    },
  );
  const remove = vi.fn(async (bucket: string, paths: string[]) => {
    for (const path of paths) objects.delete(`${bucket}/${path}`);
    return { error: null as unknown };
  });
  const storage = {
    from: vi.fn((bucket: string) => ({
      createSignedUrl: vi.fn(async (path: string) => ({
        data: {
          signedUrl: `https://storage.test/object?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`,
        },
        error: null,
      })),
      upload: (path: string, body: AsyncIterable<Buffer>) =>
        upload(bucket, path, body),
      copy: (
        from: string,
        to: string,
        options: { destinationBucket: string },
      ) => copy(bucket, from, to, options.destinationBucket),
      remove: (paths: string[]) => remove(bucket, paths),
      info: vi.fn(async (path: string) => ({
        data: {
          createdAt: new Date().toISOString(),
          size: objects.get(`${bucket}/${path}`)?.length,
        },
        error: null,
      })),
    })),
  };
  const client = {
    storage,
    from: vi.fn((table: string) => {
      if (
        !["xrag_import_transactions", "xrag_prepared_uploads"].includes(table)
      )
        return query({ data: null, error: null });
      const rows = table === "xrag_prepared_uploads" ? prepared : jobs;
      let update: any;
      let removeRow = false;
      const filters: ((j: any) => boolean)[] = [];
      const run = () => {
        const job = [...rows.values()].find((j) => filters.every((f) => f(j)));
        if (job && update) Object.assign(job, update);
        if (job && removeRow) rows.delete(job.id);
        return { data: job ? structuredClone(job) : null, error: null };
      };
      const q: any = {
        select: () => q,
        upsert: (value: any) => {
          if (
            ![...rows.values()].some(
              (row) => row.source_path === value.source_path,
            )
          )
            rows.set(value.id, {
              ...value,
              created_at: new Date().toISOString(),
            });
          return q;
        },
        delete: () => {
          removeRow = true;
          return q;
        },
        update: (value: any) => {
          update = value;
          return q;
        },
        eq: (k: string, v: any) => {
          filters.push((j) => j[k] === v);
          return q;
        },
        in: (k: string, v: any[]) => {
          filters.push((j) => v.includes(j[k]));
          return q;
        },
        gt: () => q,
        lt: () => q,
        single: async () => run(),
        maybeSingle: async () => run(),
        then: (resolve: any) => Promise.resolve(run()).then(resolve),
      };
      return q;
    }),
    rpc: vi.fn(async (name: string, args: any = {}) => {
      if (name === "get_xrag_import_status")
        return {
          data:
            [...jobs.values()].find(
              (job) => job.plan.source.uploadId === args.p_upload_id,
            )?.state ?? null,
          error: null,
        };
      if (name === "removable_xrag_objects") {
        const retained = [...jobs.values()]
          .filter((job) => job.state === "committed")
          .flatMap((job) =>
            job.plan.artifacts.map((a: { path: string }) => a.path),
          );
        return {
          data: args.p_paths.filter(
            (path: string) =>
              !retained.includes(`imported/${args.p_bucket}/${path}`),
          ),
          error: null,
        };
      }
      if (name === "begin_xrag_import" || name === "reserve_xrag_import") {
        jobs.set(args.p_id, {
          id: args.p_id,
          token: args.p_token,
          user_id: args.p_user_id,
          state: "preparing",
          files_applied: false,
          plan: structuredClone(args.p_plan),
          cleaned_at: null,
        });
        if (name === "reserve_xrag_import") return { data: null, error: null };
      }
      const job = jobs.get(args.p_id);
      if (name === "begin_xrag_import" || name === "set_xrag_import_plan") {
        if (!job || job.token !== args.p_token || job.state !== "preparing")
          return { data: null, error: new Error("XRAG_IMPORT_LEASE_LOST") };
        const plan = structuredClone(args.p_plan);
        plan.files.forEach((f: any) => {
          f.hadOriginal = objects.has(`database_files/${f.path}`);
        });
        job.plan = plan;
        return { data: plan, error: null as unknown };
      }
      if (name === "commit_xrag_import") {
        if (commitFailure === "before")
          return { data: null, error: new Error("commit failed") };
        const result = {
          workspaceId: job.plan.target?.workspaceId ?? null,
          imported: job.plan.entries.map(
            ({ kind, originId, localId }: any) => ({ kind, originId, localId }),
          ),
          publications: job.plan.artifacts.map(() => "publication-id"),
          documentFileCount: job.plan.processing.length,
        };
        Object.assign(job, { state: "committed", result });
        return {
          data: result,
          error: commitFailure === "after" ? new Error("lost response") : null,
        };
      }
      if (name === "finish_xrag_import_rollback") job.state = "rolled_back";
      return { data: null, error: null as unknown };
    }),
  };
  return {
    client,
    objects,
    jobs,
    prepared,
    upload,
    copy,
    remove,
    failCommit: (when: typeof commitFailure) => {
      commitFailure = when;
    },
  };
}
