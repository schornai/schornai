import { deletePreparedXRAGTransfer } from "./deletePreparedXRAGTransfer.ts";
import { createReadStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { Readable } from "node:stream";
import { join } from "node:path";
import type { z } from "zod";
import { selectXRAGImportEntries } from "./selectXRAGImportEntries.ts";
import {
  requireXRAGArchiveAccess,
  requireImportAccess,
} from "./requireImportAccess.ts";
import { getXRAGClaims } from "./authentication.ts";
import type { XRAGOptions } from "./authentication.ts";
import { prepareXRAGTransfer } from "./prepareXRAGTransfer.ts";
import {
  readPreparedResource,
  type ImportDocumentFile,
} from "./readPreparedResource.ts";
import { getXRAGUserId } from "./authentication.ts";
import { prepareConfirmedResourceImport } from "./prepareConfirmedResourceImport.ts";
import { importTransferInputSchema } from "./transferSchema.ts";
import { XRAG_BUCKET } from "./_schema.ts";
import { StorageSession } from "../storage/_utils/StorageSession.ts";
import { resolvePath } from "@schornio/aibox-package-utils/resolvePath";
import {
  MDC_FILE_EXTENSION,
  TRANSCRIPT_FILE_EXTENSION,
  EMPTY_FOLDER_PLACEHOLDER,
} from "../storage/_utils/toStorageObjectArray.ts";
import {
  IMPORT_STAGING_BUCKET,
  importPlanSchema,
  importResultSchema,
  json,
  readImport,
  setImportApplying,
  type ImportPlan,
} from "./importTransaction.ts";
import { createImportStorageClient } from "./createImportStorageClient.ts";
import { recoverXRAGImport } from "./recoverXRAGImport.ts";
import { withImportLease } from "./withImportLease.ts";

/** Authorize and prepare everything before publishing metadata and durable work.
 * Storage mutations have persistent undo records and fenced recovery credentials. */
export async function importXRAGTransfer(
  input: z.infer<typeof importTransferInputSchema>,
  options: XRAGOptions,
) {
  const {
    source,
    target,
    confirmedRevisions,
    modelSelections,
    selectedEntries,
  } = importTransferInputSchema.parse(input);
  const { entries: allArchives } = await prepareXRAGTransfer(source, options);
  const userId = await getXRAGUserId(options);
  const directory = await mkdtemp(join(tmpdir(), "xrag-install-"));
  try {
    const claims = await getXRAGClaims(options);
    requireXRAGArchiveAccess(
      allArchives.map((a) => a.xrag),
      claims,
    );
    const archives = selectXRAGImportEntries(allArchives, selectedEntries);
    requireImportAccess(
      archives.map((a) => a.xrag),
      target
        ? target.newWorkspaceName === undefined
          ? { workspaceId: target.workspaceId }
          : { newWorkspace: true }
        : undefined,
      claims,
    );
    const resources = archives.filter((a) => a.xrag.xrag_type === "resource");
    const entries =
      resources.length || target?.newWorkspaceName !== undefined
        ? await prepareConfirmedResourceImport(
            resources.map((a) => a.xrag),
            target!,
            confirmedRevisions,
            options,
            modelSelections,
          )
        : [];
    const id = crypto.randomUUID();
    const token = crypto.randomUUID();
    const plan: ImportPlan = {
      source: { path: source.path },
      entries: JSON.parse(JSON.stringify(entries)),
      target,
      claims,
      files: [],
      artifacts: [],
      processing: [],
    };
    const uploads = new Map<string, ImportDocumentFile>();
    for (const resource of resources) {
      if (
        resource.xrag.xrag_type !== "resource" ||
        resource.xrag.resourceType !== "documentRepository"
      )
        continue;
      const originId = resource.xrag.id;
      const entry = entries.find((e) => e.originId === originId)!;
      const manifest = await readPreparedResource(resource, directory, options);
      const storage = {
        type: "documentRepository" as const,
        documentRepositoryId: entry.localId,
        workspaceId: target!.workspaceId,
      };
      const groups = new Map<string, typeof manifest>();
      for (const file of manifest) {
        const normalized = resolvePath(file.path);
        const suffix = [MDC_FILE_EXTENSION, TRANSCRIPT_FILE_EXTENSION].find(
          (s) => normalized.endsWith(s),
        );
        const base = suffix ? normalized.slice(0, -suffix.length) : normalized;
        groups.set(base, [...(groups.get(base) ?? []), file]);
      }
      for (const [base, files] of groups) {
        const original = files.some((f) => resolvePath(f.path) === base);
        const desired: ImportDocumentFile[] = [...files];
        // A replacement must never reuse a previous version's extracted content.
        if (original && !base.endsWith(EMPTY_FOLDER_PLACEHOLDER)) {
          for (const suffix of [
            MDC_FILE_EXTENSION,
            TRANSCRIPT_FILE_EXTENSION,
          ]) {
            if (!files.some((f) => resolvePath(f.path) === base + suffix))
              desired.push({
                path: base + suffix,
                size: 0,
                contentType: "application/octet-stream",
              });
          }
          plan.processing.push({
            id: crypto.randomUUID(),
            storage,
            path: base,
            useSavedContent: files.some((f) => resolvePath(f.path) !== base),
          });
        }
        for (const file of desired) {
          const number = plan.files.length;
          const remove = !files.includes(file);
          plan.files.push({
            path: StorageSession.getStoragePath(file.path, storage).storagePath,
            basePath: StorageSession.getStoragePath(base, storage).storagePath,
            backup: `${id}/old/${number}`,
            hadOriginal: false,
            remove,
          });
          if (!remove)
            uploads.set(
              StorageSession.getStoragePath(file.path, storage).storagePath,
              file,
            );
        }
      }
    }
    for (const archive of archives.filter(
      (a) => a.xrag.xrag_type !== "resource",
    )) {
      const path = `uploads/${id}/${archive.id}.xrag.tar`;
      plan.artifacts.push({ path, name: `${archive.id}.xrag.tar` });
    }
    const supabase = options.supabaseServiceRole;
    const begin = await supabase.rpc("begin_xrag_import", {
      p_id: id,
      p_token: token,
      p_user_id: userId,
      p_plan: json(plan),
    });
    // A lost begin response cannot leave changed target data: begin only reserves.
    if (begin.error || !begin.data)
      throw new Error("XRAG_IMPORT_PREPARE_FAILED");
    const prepared = importPlanSchema.parse(begin.data);
    try {
      const result = await withImportLease(
        id,
        token,
        supabase,
        options.signal,
        async (signal) => {
          const storage = createImportStorageClient(id, token).storage;
          // Models and updates become artifact originals. Resources never do.
          for (const archive of archives.filter(
            (a) => a.xrag.xrag_type !== "resource",
          )) {
            signal.throwIfAborted();
            if (!archive.source) throw new Error("XRAG_TRANSFER_UNAVAILABLE");
            const path = `uploads/${id}/${archive.id}.xrag.tar`;
            const copied = await storage
              .from(archive.source.bucket)
              .copy(archive.source.path, path, {
                destinationBucket: XRAG_BUCKET,
              });
            if (copied.error) throw new Error("XRAG_FILE_IMPORT_FAILED");
            const info = await storage.from(XRAG_BUCKET).info(path);
            if (info.error || info.data?.size !== archive.size)
              throw new Error("XRAG_FILE_IMPORT_FAILED");
          }
          for (const file of prepared.files) {
            signal.throwIfAborted();
            if (!file.hadOriginal) continue;
            const backup = await storage
              .from("database_files")
              .copy(file.path, file.backup, {
                destinationBucket: IMPORT_STAGING_BUCKET,
              });
            if (backup.error) throw new Error("XRAG_IMPORT_BACKUP_FAILED");
          }
          signal.throwIfAborted();
          await setImportApplying(id, token, supabase);
          for (const file of prepared.files) {
            signal.throwIfAborted();
            const removed = await storage
              .from("database_files")
              .remove([file.path]);
            if (removed.error) throw new Error("XRAG_FILE_IMPORT_FAILED");
            if (!file.remove) {
              const upload = uploads.get(file.path)!;
              if (upload.source) {
                const installed = await storage
                  .from(upload.source.bucket)
                  .copy(upload.source.path, file.path, {
                    destinationBucket: "database_files",
                  });
                if (installed.error) throw new Error("XRAG_FILE_IMPORT_FAILED");
              } else {
                const body = createReadStream(upload.localPath!, { signal });
                try {
                  const installed = await storage
                    .from("database_files")
                    .upload(
                      file.path,
                      Readable.toWeb(
                        body,
                      ) as unknown as ReadableStream<Uint8Array>,
                      {
                        contentType: upload.contentType,
                        upsert: false,
                        duplex: "half",
                        headers: { "Content-Length": String(upload.size) },
                      },
                    );
                  if (installed.error)
                    throw new Error("XRAG_FILE_IMPORT_FAILED");
                } finally {
                  body.destroy();
                }
              }
              const info = await storage.from("database_files").info(file.path);
              if (info.error || info.data?.size !== upload.size)
                throw new Error("XRAG_FILE_IMPORT_FAILED");
            }
          }
          signal.throwIfAborted();
          const committed = await supabase.rpc("commit_xrag_import", {
            p_id: id,
            p_token: token,
          });
          if (committed.error) throw new Error("XRAG_IMPORT_COMMIT_UNCERTAIN");
          return importResultSchema.parse(committed.data);
        },
      );
      // Delete resources, unselected children and undo copies immediately.
      // A cleanup outage is retried by the scheduler, never reported as a failed commit.
      await recoverXRAGImport(id, { supabase }).catch(() => {});
      return result;
    } catch (error) {
      // Commit might have succeeded despite a failed response. Never undo it.
      const saved = await readImport(id, supabase);
      if (saved.state === "committed") {
        await recoverXRAGImport(id, { supabase }).catch(() => {});
        return importResultSchema.parse(saved.result);
      }
      await recoverXRAGImport(id, { supabase, token });
      throw error;
    }
  } catch (error) {
    // These are requests for a user decision, not failed installations.
    const pendingDecision =
      error instanceof Error &&
      [
        "XRAG_WORKSPACE_REQUIRED",
        "XRAG_IMPORT_CONFLICT",
        "XRAG_MODEL_SELECTION_REQUIRED",
        "XRAG_MODEL_SELECTION_INVALID",
      ].includes(error.message);
    if (!pendingDecision)
      await deletePreparedXRAGTransfer(source.path, {
        supabase: options.supabaseServiceRole,
      }).catch(() => {});
    throw error;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
