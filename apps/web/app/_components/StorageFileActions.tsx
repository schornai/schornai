"use client";
import { StoragePickerDialog } from "./StoragePickerDialog";
import { storageTransferFile } from "../_actions/storageTransferFile";
import { type ReactElement, type ReactNode, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import {
  Copy,
  FolderInput,
  Download,
  Ellipsis,
  FileDown,
  Pencil,
  RotateCw,
  SlidersHorizontal,
  TextCursorInput,
  X,
} from "lucide-react";
import type {
  Storage,
  StorageFileObject,
} from "@schornio/aibox-package-database/storage/_types";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import {
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@schornio/aibox-package-ui/components/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@schornio/aibox-package-ui/components/dialog";
import { Input } from "@schornio/aibox-package-ui/components/input";
import {
  Field,
  FieldLabel,
  FieldDescription,
} from "@schornio/aibox-package-ui/components/field";
import { StorageActionMenu } from "./StorageActionMenu";
import { storageFileAction } from "../_actions/storageFileAction";
import { storageToAppBasePath } from "@/lib/storageToAppBasePath";
import {
  fileNeedsProcessing,
  getFileCategory,
} from "@schornio/aibox-package-utils/getFileTypeLabel";

export function StorageFileActions({
  file,
  storage,
  canWrite = false,
  navigateAfterChange = false,
  busy = false,
  children,
  options = false,
  editable = false,
}: {
  file: StorageFileObject;
  storage: Storage;
  canWrite?: boolean;
  navigateAfterChange?: boolean;
  busy?: boolean;
  options?: boolean;
  editable?: boolean;
  children?: (actions: ReactNode) => ReactElement;
}) {
  const { t } = useT("common", { keyPrefix: "_components.StorageFileActions" });
  const id = useId();
  const router = useRouter();
  const [transfer, setTransfer] = useState<"copy" | "move">();
  const [action, setAction] = useState<"rename" | "delete" | "process">();
  const [name, setName] = useState(file.name);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState(false);
  const { executeAsync, isPending } = useAction(storageFileAction);
  const downloadableText =
    file.readableContent ||
    ["plain-text", "code"].includes(getFileCategory(file.path) ?? "");
  const processable =
    fileNeedsProcessing(file.path) ||
    ["plain-text", "code"].includes(getFileCategory(file.path) ?? "");
  const url = (format: string) =>
    `/api/storage-file/download?${new URLSearchParams({ storage: JSON.stringify(storage), path: file.path, format })}`;
  return (
    <>
      <StorageActionMenu
        children={children}
        trigger={
          <Button
            variant="ghost"
            size={options ? "default" : "icon"}
            aria-label={
              options
                ? t("labelOptions")
                : t("labelActions", { name: file.name })
            }
          >
            {options ? (
              <>
                <SlidersHorizontal />
                <span className="sr-only sm:not-sr-only">
                  {t("labelOptions")}
                </span>
              </>
            ) : (
              <Ellipsis />
            )}
          </Button>
        }
        items={
          <DropdownMenuGroup>
            <DropdownMenuItem render={<a href={url("original")} download />}>
              <Download />
              {t("labelDownloadOriginal")}
            </DropdownMenuItem>
            {downloadableText && (
              <DropdownMenuItem render={<a href={url("processed")} download />}>
                <FileDown />
                {t("labelDownloadProcessed")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              disabled={busy}
              onClick={() => setTransfer("copy")}
            >
              <Copy />
              {t("labelCopy")}
            </DropdownMenuItem>
            {canWrite && (
              <DropdownMenuItem
                disabled={busy}
                onClick={() => setTransfer("move")}
              >
                <FolderInput />
                {t("labelMove")}
              </DropdownMenuItem>
            )}
            {canWrite && editable && (
              <DropdownMenuItem
                disabled={busy}
                onClick={() =>
                  router.push(
                    `${storageToAppBasePath(storage)}/${file.path.split("/").map(encodeURIComponent).join("/")}?view=edit`,
                  )
                }
              >
                <Pencil />
                {t("labelEdit")}
              </DropdownMenuItem>
            )}
            {canWrite && (
              <>
                <DropdownMenuItem
                  disabled={busy}
                  onClick={() => {
                    setName(file.name);
                    setError(false);
                    setAction("rename");
                  }}
                >
                  <TextCursorInput />
                  {t("labelRename")}
                </DropdownMenuItem>
                {processable && (
                  <DropdownMenuItem
                    disabled={busy}
                    onClick={() => {
                      setError(false);
                      setAction("process");
                    }}
                  >
                    <RotateCw />
                    {t("labelProcess")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  disabled={busy}
                  variant="destructive"
                  onClick={() => {
                    setError(false);
                    setAction("delete");
                  }}
                >
                  <X />
                  {t("labelDelete")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuGroup>
        }
      />
      <StoragePickerDialog
        open={Boolean(transfer)}
        onOpenChange={(open) => {
          if (!open) setTransfer(undefined);
        }}
        mode="folder"
        currentStorage={canWrite ? storage : undefined}
        title={t(transfer === "move" ? "labelMove" : "labelCopy")}
        description={t(
          transfer === "move" ? "descriptionMove" : "descriptionCopy",
          { name: file.name },
        )}
        onSelect={async (selection) => {
          const response = await storageTransferFile({
            from: { storage, path: file.path },
            to: { storage: selection.storage, folder: selection.path },
            move: transfer === "move",
          });
          if (!response?.data || !response.data.result)
            throw new Error(response?.data?.error ?? "TRANSFER_FAILED");
          setMessage(
            response.data.result.processing === "error"
              ? "descriptionTransferProcessingError"
              : "descriptionTransferred",
          );
          if (transfer === "move" && navigateAfterChange)
            router.push(
              `${storageToAppBasePath(storage)}/${file.path.split("/").slice(0, -1).join("/")}`,
            );
          router.refresh();
        }}
      />
      {message && !children && (
        <p role="status" className="text-muted-foreground text-sm">
          {t(message)}
        </p>
      )}
      {message &&
        children &&
        createPortal(
          <p
            role="status"
            className="bg-background fixed right-4 bottom-4 rounded-lg border p-3 text-sm"
          >
            {t(message)}
          </p>,
          document.body,
        )}
      <Dialog
        open={Boolean(action)}
        onOpenChange={(open) => {
          if (!open && !isPending) setAction(undefined);
        }}
      >
        <DialogContent>
          <form
            className="contents"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!action || isPending) return;
              setError(false);
              setMessage(undefined);
              try {
                const result = await executeAsync({
                  action,
                  storage,
                  path: file.path,
                  newName: name,
                });
                if (!result?.data) throw new Error();
                const data = result.data;
                if ("processing" in data)
                  setMessage(
                    data.processing === "unsupported"
                      ? "descriptionUnsupported"
                      : "descriptionQueued",
                  );
                if (
                  navigateAfterChange &&
                  !("processing" in data) &&
                  (data.file || data.deleted)
                ) {
                  const path =
                    data.file?.path ??
                    file.path.split("/").slice(0, -1).join("/");
                  router.push(`${storageToAppBasePath(storage)}/${path}`);
                }
                router.refresh();
                setAction(undefined);
              } catch {
                setError(true);
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {t(
                  action === "delete"
                    ? "labelDelete"
                    : action === "process"
                      ? "labelProcess"
                      : "labelRename",
                )}
              </DialogTitle>
              {action !== "rename" && (
                <DialogDescription>
                  {t(
                    action === "delete"
                      ? "descriptionDelete"
                      : "descriptionProcess",
                    { name: file.name },
                  )}
                </DialogDescription>
              )}
            </DialogHeader>
            {action === "rename" && (
              <Field>
                <FieldLabel className="sr-only" htmlFor={id}>
                  {t("labelName")}
                </FieldLabel>
                <Input
                  id={id}
                  value={name}
                  required
                  maxLength={200}
                  disabled={isPending}
                  onChange={(event) => setName(event.target.value)}
                />
              </Field>
            )}
            {error && (
              <FieldDescription role="alert">
                {t("errorAction")}
              </FieldDescription>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setAction(undefined)}
              >
                {t("labelCancel")}
              </Button>
              <ButtonAction
                type="submit"
                isPending={isPending}
                variant={action === "delete" ? "destructive" : "default"}
              >
                {t("labelConfirm")}
              </ButtonAction>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
