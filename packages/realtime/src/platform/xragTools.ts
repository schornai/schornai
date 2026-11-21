import { listXRAGExportJobs } from "@schornio/aibox-database/xrag/listXRAGExportJobs";
import {
  cancelXRAGExport,
  xragExportJobSchema,
} from "@schornio/aibox-database/xrag/cancelXRAGExport";
import { deleteXRAGExport } from "@schornio/aibox-database/xrag/deleteXRAGExport";
import { getXRAGExportDownload } from "@schornio/aibox-database/xrag/getXRAGExportDownload";
import { listXRAGTransfers } from "@schornio/aibox-database/xrag/listXRAGTransfers";
import {
  deleteXRAGTransfer,
  deleteXRAGTransferSchema,
} from "@schornio/aibox-database/xrag/deleteXRAGTransfer";
import {
  inspectXRAGTransfer,
  inspectXRAGTransferSchema,
} from "@schornio/aibox-database/xrag/inspectXRAGTransfer";
import { getXRAGRelatedObjects } from "@schornio/aibox-database/xrag/getXRAGRelatedObjects";
import {
  packageObjectSchema,
  addXRAGPackageItemSchema,
  packageIdSchema,
  packageItemSchema,
  xragSelectionSchema,
} from "@schornio/aibox-database/xrag/packageSchema";
import { createXRAGPackageSchema } from "@schornio/aibox-database/xrag/createXRAGPackage";
import { listXRAGPackages } from "@schornio/aibox-database/xrag/listXRAGPackages";
import { createXRAGPackage } from "@schornio/aibox-database/xrag/createXRAGPackage";
import { addXRAGPackageItem } from "@schornio/aibox-database/xrag/addXRAGPackageItem";
import { removeXRAGPackageItem } from "@schornio/aibox-database/xrag/removeXRAGPackageItem";
import { deleteXRAGPackage } from "@schornio/aibox-database/xrag/deleteXRAGPackage";
import { exportXRAGPackage } from "@schornio/aibox-database/xrag/exportXRAGPackage";
import { z } from "zod";
import { getEnvSafe } from "@schornio/aibox-package-utils/getEnvSafe";
import { resourceKindSchema } from "xrag/schema";
import { limitPlatformClaims } from "@schornio/aibox-database/mcp/platformAccess";
import { getWorkspaces } from "@schornio/aibox-database/workspace/getWorkspaces";
import { exportXRAG } from "@schornio/aibox-database/xrag/exportXRAG";
import { createTransferUpload } from "@schornio/aibox-database/xrag/createTransferUpload";
import { previewXRAGImport } from "@schornio/aibox-database/xrag/previewXRAGImport";
import { getAuthorizedResource } from "@schornio/aibox-database/xrag/getAuthorizedResource";
import { getResourceIdentity } from "@schornio/aibox-database/xrag/getResourceIdentity";
import {
  setResourceIdentity,
  setResourceIdentitySchema,
} from "@schornio/aibox-database/xrag/setResourceIdentity";
import {
  importPreviewInputSchema,
  importTransferInputSchema,
  transferPathSchema,
  XRAG_TRANSFER_BUCKET,
  XRAG_UPLOAD_CHUNK_BYTES,
} from "@schornio/aibox-database/xrag/transferSchema";
import { importXRAGTransfer as importXRAG } from "@schornio/aibox-database/xrag/importXRAGTransfer";
import type { platformRegistry, PlatformContext } from "./registry.ts";

export function addXRAGTools(
  context: PlatformContext,
  { add }: ReturnType<typeof platformRegistry>,
) {
  function download<T extends { url: string }>(file: T) {
    return { ...file, url: context.xragDownloadUrl?.(file.url) ?? file.url };
  }

  async function options(resourceOnly = false) {
    const level = resourceOnly ? "workspace" : context.level;
    const ids =
      context.claims === "admin" && level !== "admin"
        ? (await getWorkspaces({ supabase: context.supabase })).map(
            (workspace) => workspace.id,
          )
        : [];
    return {
      ...context,
      authenticated: {
        userId: context.userId,
        claims: limitPlatformClaims(context.claims, level, ids),
      },
    };
  }
  add(
    "platform_xrag_transfer_list",
    "List the caller's pending XRAG uploads and prepared contents, including upload ID and size in bytes (null if unknown). Pending selections expire after one hour. Failed or completed imports delete their temporary contents.",
    "workspace",
    true,
    z.object({}),
    async () => listXRAGTransfers(await options()),
  );
  add(
    "platform_xrag_transfer_delete",
    "Delete an owned temporary XRAG archive. Does not delete imported objects or published artifacts.",
    "workspace",
    false,
    deleteXRAGTransferSchema,
    async (input) => deleteXRAGTransfer(input, await options()),
  );
  add(
    "platform_xrag_upload_url",
    "Create an immutable XRAG upload owned by the caller. For files larger than 6 MiB use the returned resumable TUS settings. Smaller files up to 6 MiB also support PUT to url. If the token expires, pass the same path to renew it and resume the TUS session. After the upload, use path to inspect, preview or import.",
    "workspace",
    false,
    z.object({ path: transferPathSchema.optional() }),
    async ({ path }) => {
      const upload = await createTransferUpload(await options(), path);
      const urls = context.xragUploadUrls?.(upload.path, upload.token) ?? {
        url: upload.url,
        resumableEndpoint:
          getEnvSafe("SUPABASE_URL").replace(/\/+$/, "") +
          "/storage/v1/upload/resumable/sign",
      };
      return {
        path: upload.path,
        token: upload.token,
        url: urls.url,
        resumable: {
          endpoint: urls.resumableEndpoint,
          chunkSize: XRAG_UPLOAD_CHUNK_BYTES,
          headers: { "x-signature": upload.token },
          metadata: {
            bucketName: XRAG_TRANSFER_BUCKET,
            objectName: upload.path,
            contentType: "application/x-tar",
          },
        },
      };
    },
  );
  add(
    "platform_xrag_export",
    "Export one authorized agent, transcriber, document repository (including files), personal automation, or local model from its installed files or a published archive. Automation triggers tied to activity sessions cannot be transferred. Optionally include directly referenced local models. External API models remain references to a provider and model ID. Returns a download URL valid for ten minutes.",
    "workspace",
    false,
    xragSelectionSchema,
    async (input) => download(await exportXRAG(input, await options())),
  );
  add(
    "platform_xrag_inspect",
    "Inspect an entire upload before choosing a workspace. Returns sanitized display entries with immutable archiveId, digest and needsWorkspace. Entire-package permissions apply even to deselected entries.",
    "workspace",
    false,
    inspectXRAGTransferSchema,
    async (input) => inspectXRAGTransfer(input, await options()),
  );
  add(
    "platform_xrag_preview",
    "Validate an entire uploaded archive and preview conflicts for selectedEntries (child archive digests). Omit selectedEntries to import all. A target workspace is required only for selected resources. Returns the source digest, existing-object revisions and externalModels candidates matched by provider/modelId. A unique candidate is selected automatically; ask the user to choose when multiple candidates exist. Missing matches remain unresolved and do not block import; the user can select a model afterwards. Model/platform contents and new workspaces require global administrator access.",
    "workspace",
    false,
    importPreviewInputSchema,
    async (input) => previewXRAGImport(input, await options()),
  );
  add(
    "platform_xrag_import",
    "Import resources into an administrated existing workspace after preview. Supply the preview digest, selectedEntries and explicitly confirmed revisions. Omit target for model/platform-only imports. Pass modelSelections as sourceIdentifier -> chosen destination identifier from preview.externalModels. Existing destination credentials are reused; ambiguous or stale selections fail; missing models remain unresolved. Rejects the entire package if it contains any model or platform content, even for global administrators. Files are installed directly with durable undo for overwritten files before committing resource metadata and processing jobs together. Failed transfers are restored automatically; during Storage outages recovery remains pending. Successful import deletes the entire prepared upload, including unselected contents; only model/platform packages remain as artifacts. Returns documentFileCount; document processing is asynchronous.",
    "workspace",
    false,
    importTransferInputSchema,
    async (input) => importXRAG(input, await options(true)),
  );
  add(
    "platform_xrag_import_admin",
    "Import resources and/or model/platform packages after preview, optionally creating a workspace. Requires global administrator access. Supply the preview digest, selectedEntries and explicitly confirmed revisions. Omit target for model/platform-only imports. Pass modelSelections as sourceIdentifier -> chosen destination identifier from preview.externalModels. Existing destination credentials are reused; ambiguous or stale selections fail; missing models remain unresolved. Files are installed directly with durable undo for overwritten files before committing metadata, artifact publication jobs and document-processing jobs together. Failed transfers are restored automatically; during Storage outages recovery remains pending. Successful import deletes the entire prepared upload, including unselected contents; only model/platform packages remain as artifacts. Returns documentFileCount. Model/platform installation and document processing remain asynchronous.",
    "admin",
    false,
    importTransferInputSchema,
    async (input) => importXRAG(input, await options()),
  );
  add(
    "platform_xrag_identity_get",
    "Read or initialize the global identifier of an authorized resource. Local runtime IDs are unchanged.",
    "workspace",
    false,
    z.object({ kind: resourceKindSchema, id: z.string().min(1) }),
    async (input) => {
      const opts = await options();
      const object = await getAuthorizedResource(input.kind, input.id, opts);
      return {
        globalId: await getResourceIdentity(
          input.kind,
          object.id,
          object.workspaceId,
          { supabase: opts.supabaseServiceRole, name: object.name },
        ),
      };
    },
  );
  add(
    "platform_xrag_identity_set",
    "Change a resource's global identifier for future exports and references. Supply its expected current identifier; stale edits and target-workspace collisions fail. Existing archives keep their previous IDs.",
    "workspace",
    false,
    setResourceIdentitySchema,
    async (input) => setResourceIdentity(input, await options()),
  );
  add(
    "platform_xrag_saved_package_list",
    "List the caller\u2019s saved XRAG packages and object selections.",
    "workspace",
    true,
    z.object({}),
    async () => listXRAGPackages(await options()),
  );
  add(
    "platform_xrag_saved_package_create",
    "Create a named personal XRAG package.",
    "workspace",
    false,
    createXRAGPackageSchema,
    async (input) => createXRAGPackage(input, await options()),
  );
  add(
    "platform_xrag_saved_package_add",
    "Add an authorized resource or a local model (kind: model, id from platform_models_list) to a personal XRAG package. External API models have no archive. To include connected objects, choose them using platform_xrag_related_objects. All selected entries are saved together.",
    "workspace",
    false,
    addXRAGPackageItemSchema,
    async (input) => addXRAGPackageItem(input, await options()),
  );
  add(
    "platform_xrag_saved_package_remove",
    "Remove an object selection from a personal XRAG package without deleting the object.",
    "workspace",
    false,
    packageItemSchema,
    async (input) => removeXRAGPackageItem(input, await options()),
  );
  add(
    "platform_xrag_saved_package_delete",
    "Delete a personal XRAG package without deleting its objects.",
    "workspace",
    false,
    packageIdSchema,
    async (input) => deleteXRAGPackage(input, await options()),
  );
  add(
    "platform_xrag_saved_package_export",
    "Queue the selected resources and local models from installed files or published archives as one downloadable .xrag.tar (up to 200 GiB). Returns jobId immediately. Use platform_xrag_export_jobs to check progress and platform_xrag_export_download when finished. Permissions are checked again at execution and download.",
    "workspace",
    false,
    packageIdSchema,
    async (input) => exportXRAGPackage(input, await options()),
  );
  add(
    "platform_xrag_export_jobs",
    "List the caller's durable package export jobs and byte progress. Finished downloads expire after 72 hours.",
    "workspace",
    true,
    z.object({}),
    async () => listXRAGExportJobs(await options()),
  );
  add(
    "platform_xrag_export_cancel",
    "Cancel an owned queued or running package export.",
    "workspace",
    false,
    xragExportJobSchema,
    async (input) => cancelXRAGExport(input, await options()),
  );
  add(
    "platform_xrag_export_delete",
    "Delete an owned finished, failed or cancelled export job and its downloadable archive. The saved package and source resources are preserved.",
    "workspace",
    false,
    xragExportJobSchema,
    async (input) => deleteXRAGExport(input, await options()),
  );
  add(
    "platform_xrag_export_download",
    "Get a fresh ten-minute download URL for an owned finished package export, after checking current source permissions.",
    "workspace",
    true,
    xragExportJobSchema,
    async (input) =>
      download(await getXRAGExportDownload(input, await options())),
  );
  add(
    "platform_xrag_related_objects",
    "List exportable connected objects, including transitive document repositories, transcribers and local models, for explicit selection in an XRAG package. Does not add any objects.",
    "workspace",
    true,
    packageObjectSchema,
    async (input) => getXRAGRelatedObjects(input, await options()),
  );
}
