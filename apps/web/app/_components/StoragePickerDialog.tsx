"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useT } from "next-i18next/client";
import { ArrowUp, File, Folder } from "lucide-react";
import type {
  Storage,
  StorageFileObject,
  StorageObject,
} from "@schornio/aibox-package-database/storage/_types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@schornio/aibox-package-ui/components/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@schornio/aibox-package-ui/components/select";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { Field, FieldLabel } from "@schornio/aibox-package-ui/components/field";
import { storageBrowse } from "../_actions/storageBrowse";
export type StorageSelection = {
  storage: Storage;
  path: string;
  file?: StorageFileObject;
};

export function StoragePickerDialog({
  open,
  onOpenChange,
  currentStorage,
  mode,
  title,
  description,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStorage?: Storage;
  mode: "file" | "folder";
  title?: string;
  description?: string;
  onSelect: (selection: StorageSelection) => Promise<void>;
}) {
  const { t } = useT("common", {
    keyPrefix: "_components.StoragePickerDialog",
  });
  const id = useId();
  const request = useRef(0);
  const [options, setOptions] = useState<
    { key: string; label: string; storage: Storage }[]
  >([]);
  const [storage, setStorage] = useState<Storage>();
  const [path, setPath] = useState("");
  const [files, setFiles] = useState<StorageObject[]>([]);
  const [selected, setSelected] = useState<StorageFileObject>();
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const modeAccess = mode === "folder" ? "write" : "read";
  const key = (value: Storage) =>
    value.type === "documentRepository"
      ? value.documentRepositoryId
      : `${value.type}/${value.activityId}`;
  const browse = async (target: Storage, folder: string) => {
    const sequence = ++request.current;
    setLoading(true);
    setError(undefined);
    setSelected(undefined);
    setFiles([]);
    setStorage(target);
    setPath(folder);
    try {
      const result = await storageBrowse({
        storage: target,
        path: folder,
        mode: modeAccess,
      });
      if (!result?.data) throw new Error();
      if (sequence === request.current) setFiles(result.data.files);
    } catch {
      if (sequence === request.current) setError("errorLoad");
    } finally {
      if (sequence === request.current) setLoading(false);
    }
  };
  const initialize = async () => {
    const sequence = ++request.current;
    setLoading(true);
    setError(undefined);
    setSelected(undefined);
    setStorage(undefined);
    setFiles([]);
    setOptions([]);
    try {
      const result = await storageBrowse({ path: "", mode: modeAccess });
      if (!result?.data) throw new Error();
      const next = [
        ...(currentStorage
          ? [
              {
                key: key(currentStorage),
                label: t("labelCurrentStorage"),
                storage: currentStorage,
              },
            ]
          : []),
        ...result.data.repositories
          .filter((repo) => !currentStorage || key(currentStorage) !== repo.id)
          .map((repo) => ({
            key: repo.id,
            label: repo.workspaceName
              ? `${repo.name} · ${repo.workspaceName}`
              : repo.name,
            storage: {
              type: "documentRepository" as const,
              workspaceId: repo.workspaceId,
              documentRepositoryId: repo.id,
            },
          })),
      ];
      if (sequence !== request.current) return;
      setOptions(next);
      if (next[0]) await browse(next[0].storage, "");
      else setLoading(false);
    } catch {
      if (sequence === request.current) {
        setError("errorLoad");
        setLoading(false);
      }
    }
  };
  useEffect(() => {
    if (open) void initialize();
    return () => {
      request.current++;
    };
    // Storage is supplied by the opening control; do not reset a user's navigation on rerender.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const choose = async () => {
    if (
      !storage ||
      loading ||
      pending ||
      error === "errorLoad" ||
      (mode === "file" && !selected)
    )
      return;
    setPending(true);
    setError(undefined);
    try {
      await onSelect({ storage, path: selected?.path ?? path, file: selected });
      onOpenChange(false);
    } catch (failure) {
      const codes: Record<string, string> = {
        FILE_NOT_PROCESSED: "errorNotProcessed",
        FILE_ALREADY_EXISTS: "errorCollision",
        SOURCE_EQUALS_TARGET: "errorSameTarget",
        SOURCE_CHANGED_DURING_COPY: "errorSourceChanged",
        FILE_PROCESSING_IN_PROGRESS: "errorBusy",
        STORAGE_NOT_AUTHORIZED: "errorPermission",
        COPIED_SOURCE_DELETE_FAILED: "errorSourceDelete",
        COPY_FAILED_TARGET_CLEANUP_REQUIRED: "errorCleanup",
        TARGET_FOLDER_NOT_FOUND: "errorLoad",
      };
      setError(
        failure instanceof Error
          ? (codes[failure.message] ?? "errorAction")
          : "errorAction",
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) onOpenChange(value);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {title ??
              t(mode === "folder" ? "labelTargetFolder" : "labelSelectFile")}
          </DialogTitle>
          <DialogDescription>
            {description ??
              t(mode === "folder" ? "descriptionFolder" : "descriptionFile")}
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor={id}>{t("labelStorage")}</FieldLabel>
          <Select
            items={options.map((option) => ({
              value: option.key,
              label: option.label,
            }))}
            value={storage ? key(storage) : null}
            disabled={pending || options.length === 0}
            onValueChange={(value) => {
              const option = options.find((option) => option.key === value);
              if (option) void browse(option.storage, "");
            }}
          >
            <SelectTrigger id={id} className="w-full">
              <SelectValue placeholder={t("labelStorage")} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!storage || !path || loading || pending}
            onClick={() =>
              storage &&
              void browse(storage, path.split("/").slice(0, -1).join("/"))
            }
          >
            <ArrowUp />
            {t("labelUp")}
          </Button>
          <p className="min-w-0 text-sm break-all">/{path}</p>
        </div>
        <div
          className="max-h-72 min-h-32 overflow-y-auto rounded-lg border p-1"
          aria-busy={loading}
        >
          {loading ? (
            <p role="status" className="p-3 text-sm">
              {t("descriptionLoading")}
            </p>
          ) : (
            files
              .filter((file) => mode === "file" || file.folder)
              .map((file) => (
                <Button
                  className="w-full justify-start"
                  type="button"
                  variant={selected?.path === file.path ? "secondary" : "ghost"}
                  key={file.path}
                  disabled={pending}
                  aria-pressed={
                    file.file ? selected?.path === file.path : undefined
                  }
                  onClick={() =>
                    file.folder
                      ? storage && void browse(storage, file.path)
                      : setSelected(file)
                  }
                >
                  {file.folder ? <Folder /> : <File />}
                  <span className="truncate">{file.name}</span>
                </Button>
              ))
          )}
          {!loading &&
            files.filter((file) => mode === "file" || file.folder).length ===
              0 && (
              <p className="text-muted-foreground p-3 text-sm">
                {t(
                  options.length ? "descriptionEmpty" : "descriptionNoStorages",
                )}
              </p>
            )}
        </div>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {t(error)}
          </p>
        )}
        {error === "errorLoad" && (
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              storage ? void browse(storage, path) : void initialize()
            }
          >
            {t("labelRetry")}
          </Button>
        )}
        {pending && (
          <p role="status" className="text-muted-foreground text-sm">
            {t("descriptionPending")}
          </p>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {t("labelCancel")}
          </Button>
          <ButtonAction
            type="button"
            isPending={pending}
            disabled={
              !storage ||
              loading ||
              error === "errorLoad" ||
              (mode === "file" && !selected)
            }
            onClick={() => void choose()}
          >
            {t(mode === "folder" ? "labelUseFolder" : "labelUseFile")}
          </ButtonAction>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
