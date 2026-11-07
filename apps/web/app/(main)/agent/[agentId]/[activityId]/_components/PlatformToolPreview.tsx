"use client";
import type {
  StorageFileObject,
  StorageObject,
} from "@schornio/aibox-package-database/storage/_types";
import {
  storageSchema,
  transcriptionSchema,
} from "@schornio/aibox-package-database/storage/_schemas";
import { StorageFilePreview } from "../../../../../_components/StorageFilePreview";
import { StorageFilePreviewMDC } from "../../../../../_components/StorageFilePreviewMDC";
import { StorageObjectTile } from "../../../../../_components/StorageObjectTile";
import { StorageObjectTileContainer } from "../../../../../_components/StorageObjectTileContainer";
import { FileIcon } from "../../../../../_components/FileIcon";
import { storageToAppBasePath } from "@/lib/storageToAppBasePath";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { CodeInline } from "@schornio/aibox-package-ui/components/code-inline";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
} from "@schornio/aibox-package-ui/components/empty";
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import Link from "next/link";

import { useT } from "next-i18next/client";
import { agentSchema } from "@schornio/aibox-package-database/agent/_schemas";
import { documentRepositorySchema } from "@schornio/aibox-package-database/documentRepositories/_schema";
import { AgentInfo } from "../../../_components/AgentInfo";
import { DocumentRepositoryInfo } from "../../../../app/documents/[documentRepositoryId]/_components/DocumentRepositoryInfo";
import { MarkdownProse } from "@schornio/aibox-package-ui/components/markdown-prose";
import { Badge } from "@schornio/aibox-package-ui/components/badge";

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
function confidential(key: string) {
  return /password$|secret|api.?key|authorization|cookie|^headers$|^token$|^accessToken$|^refreshToken$|^base64$/i.test(
    key,
  );
}

/** Read-only snapshots: never fetch current data or expose edit/favorite actions. */
export function PlatformToolPreview({
  toolName,
  value,
  input,
  result = false,
}: {
  toolName: string;
  value: unknown;
  input?: unknown;
  result?: boolean;
}) {
  const { t } = useT("agent", { keyPrefix: "_components.PlatformToolPreview" });
  function preview(data: unknown, key = "", depth = 0): React.ReactNode {
    if (confidential(key))
      return (
        <span className="text-muted-foreground">{t("labelConfidential")}</span>
      );
    if (data === null || data === undefined)
      return <span className="text-muted-foreground">{t("labelEmpty")}</span>;
    if (typeof data === "boolean")
      return (
        <Badge variant="outline">{t(data ? "labelYes" : "labelNo")}</Badge>
      );
    if (typeof data === "string" || typeof data === "number") {
      if (
        key === "text" ||
        key === "content" ||
        key === "current" ||
        key === "documentation"
      )
        return (
          <div className="max-h-80 overflow-auto">
            <MarkdownProse>{String(data)}</MarkdownProse>
          </div>
        );
      return (
        <span className="break-words whitespace-pre-wrap">{String(data)}</span>
      );
    }
    if (depth > 8) return <span>{t("labelNested")}</span>;
    if (Array.isArray(data))
      return data.length ? (
        <ul className="flex flex-col gap-3">
          {data.map((item, index) => (
            <li key={index} className="rounded-md border p-3">
              {preview(item, "", depth + 1)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">{t("labelNoEntries")}</p>
      );
    const object = record(data);
    if (!object) return null;
    if (
      toolName.startsWith("platform_agent") &&
      object.version === "agent-config-version-4"
    ) {
      const agent = agentSchema.safeParse(object);
      if (agent.success)
        return (
          <>
            <p className="text-muted-foreground text-xs">
              {t("fields.workspaceId")}: {agent.data.workspaceId}
            </p>
            <AgentInfo
              preview
              agent={agent.data}
              documentRepositoryMap={new Map()}
            />
          </>
        );
    }
    if (
      toolName.startsWith("platform_repositor") &&
      object.type === "database-v2"
    ) {
      const repository = documentRepositorySchema.safeParse(object);
      if (repository.success)
        return (
          <>
            <p className="text-muted-foreground text-xs">
              {t("fields.workspaceId")}: {repository.data.workspaceId}
            </p>
            <DocumentRepositoryInfo
              preview
              documentRepository={repository.data}
            />
          </>
        );
    }
    const entries = Object.entries(object);
    if (!entries.length)
      return <p className="text-muted-foreground">{t("labelNoDetails")}</p>;
    return (
      <dl className="flex min-w-0 flex-col gap-3">
        {entries.map(([field, item]) => (
          <div key={field} className="min-w-0">
            <dt className="text-muted-foreground text-xs font-medium">
              {t(`fields.${field}`, {
                defaultValue: field
                  .replace(/([a-z])([A-Z])/g, "$1 $2")
                  .replaceAll("_", " "),
              })}
            </dt>
            <dd className="min-w-0 text-sm">
              {preview(item, field, depth + 1)}
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  const request = record(result ? input : value);
  const location = storageSchema.safeParse(
    request?.storage ??
      (typeof request?.repositoryId === "string"
        ? {
            type: "documentRepository",
            documentRepositoryId: request.repositoryId,
          }
        : undefined),
  );
  const storage = location.success ? location.data : undefined;
  if (toolName === "platform_files_list" && result && Array.isArray(value)) {
    const files = value.filter(isStorageObject);
    if (files.length === value.length)
      return files.length ? (
        <StorageObjectTileContainer view="tiles-medium">
          {files.map((file) => (
            <StorageObjectTile
              key={file.path}
              storageObject={file}
              storage={storage}
              basePathApp={storage ? storageToAppBasePath(storage) : undefined}
              variant="tiles-medium"
            />
          ))}
        </StorageObjectTileContainer>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("labelNoEntries")}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      );
  }
  const writing =
    toolName === "platform_file_write" ||
    toolName === "platform_activity_file_write";
  const reading = toolName === "platform_file_read";
  const output = record(value);
  const path = typeof request?.path === "string" ? request.path : undefined;
  if (
    writing &&
    result &&
    (output?.status === "conflict" || output?.status === "recoveryRequired")
  )
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {t(
            output.status === "conflict"
              ? "descriptionConflict"
              : "descriptionRecovery",
          )}
        </AlertDescription>
      </Alert>
    );
  const text = writing
    ? request?.text
    : output?.type === "mdc"
      ? output.current
      : undefined;
  const transcript =
    reading && result && output?.type === "transcript"
      ? transcriptionSchema.safeParse(output)
      : undefined;
  if (
    path &&
    ((writing && typeof text === "string") ||
      (reading && result && (typeof text === "string" || transcript?.success)))
  ) {
    // Before saving/when reading extracted text, the tool may not include original file metadata.
    // These text-snapshot fields are not used to display original timestamps or file sizes.
    const snapshot: StorageFileObject = {
      name: path.split("/").at(-1) ?? path,
      path,
      file: true,
      type: "text/plain",
      size:
        typeof text === "string" ? new TextEncoder().encode(text).length : 0,
      createdAtISO: "",
      updatedAtISO: "",
      readableContent: transcript?.success ? "transcript" : "text",
    };
    const file =
      isStorageObject(output?.file) && output.file.file
        ? output.file
        : snapshot;
    const content = transcript?.success
      ? { ...transcript.data, type: "transcript" as const }
      : {
          type: "mdc" as const,
          current: typeof text === "string" ? text : "",
          versions: [],
        };
    return (
      <div className="flex min-w-0 flex-col gap-3">
        <p className="flex items-center gap-2">
          <FileIcon path={path} />
          <CodeInline>{path}</CodeInline>
        </p>
        {storage && !result && (
          <p className="text-muted-foreground text-xs">
            {t("fields.storage")}:{" "}
            {storage.type === "documentRepository"
              ? storage.documentRepositoryId
              : storage.activityId}
          </p>
        )}
        {storage && result && (
          <div>
            <Button
              nativeButton={false}
              render={
                <Link href={`${storageToAppBasePath(storage)}/${path}`} />
              }
              size="xs"
              variant="outline"
            >
              {t("labelOpenFile")}
            </Button>
          </div>
        )}
        <div
          className="scroll-fade max-h-80 min-w-0 overflow-auto"
          tabIndex={0}
        >
          {result && storage ? (
            <StorageFilePreview
              fileObject={file}
              fileContent={content}
              storage={storage}
              canWrite={false}
            />
          ) : content.type === "mdc" ? (
            <StorageFilePreviewMDC fileObject={file} fileContent={content} />
          ) : (
            preview(value)
          )}
        </div>
        {result && output?.indexQueued === false && (
          <Alert>
            <AlertDescription>
              {t("descriptionIndexNotQueued")}
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }
  return <div className="min-w-0 overflow-hidden">{preview(value)}</div>;
}

function isStorageObject(value: unknown): value is StorageObject {
  const file = record(value);
  return (
    !!file &&
    typeof file.name === "string" &&
    typeof file.path === "string" &&
    (file.folder === true ||
      (file.file === true &&
        typeof file.size === "number" &&
        typeof file.type === "string" &&
        typeof file.createdAtISO === "string" &&
        typeof file.updatedAtISO === "string"))
  );
}
