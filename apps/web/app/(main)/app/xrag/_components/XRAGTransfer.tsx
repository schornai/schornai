"use client";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import { Paperclip } from "lucide-react";
import Link from "next/link";
import { XRAGImportExport } from "./XRAGImportExport";
import { ResourceListOptionsDropdown } from "../../../../_components/ResourceListOptionsDropdown";
import { useGroupSortView } from "@/lib/groupSortView/hook";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@schornio/aibox-package-ui/components/field";
import { Input } from "@schornio/aibox-package-ui/components/input";
import { Checkbox } from "@schornio/aibox-package-ui/components/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@schornio/aibox-package-ui/components/select";
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { XRAGImportContents } from "./XRAGImportContents";
import { inspectXRAGTransfer } from "../_actions/inspectXRAGTransfer";
import { previewXRAGImport } from "../_actions/previewXRAGImport";
import { importXRAG } from "../_actions/importXRAG";

import type { getPreparedXRAGImport } from "@schornio/aibox-package-database/xrag/getPreparedXRAGImport";
import type { Preferences } from "@/lib/groupSortView/types";

export function XRAGTransfer({
  preferences,
  uploadId,
  prepared,
  isAdmin,
  workspaces,
}: {
  preferences?: Preferences;
  uploadId: string;
  prepared?: Awaited<ReturnType<typeof getPreparedXRAGImport>>;
  isAdmin: boolean;
  workspaces: { id: string; name: string }[];
}) {
  // Revalidation after a successful import removes the inventory from the server.
  // Keep the active selection and its result until leaving this upload.
  const [initial] = useState(prepared);
  const started = useRef(false);
  const left = useRef(false);
  const { t } = useT("common", { keyPrefix: "_components.XRAGTransfer" });
  const fieldId = useId();
  const [selected, setSelected] = useState<string[]>(
    () => initial?.entries.map((entry) => entry.archiveId) ?? [],
  );
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceId] = useState(() => crypto.randomUUID());
  const [confirmed, setConfirmed] = useState<Record<string, string>>({});
  const [modelSelections, setModelSelections] = useState<
    Record<string, string>
  >({});
  const inspection = useAction(inspectXRAGTransfer, {
    onSuccess: ({ data }) => {
      if (left.current) return;
      if (!data) return;
      const selectedEntries = data.entries.map((entry) => entry.archiveId);
      setSelected(selectedEntries);
      previewSingleton(data, selectedEntries);
    },
  });
  const preview = useAction(previewXRAGImport, {
    onSuccess: ({ data, input }) => {
      if (left.current) return;
      if (
        data &&
        !data.entries.some((entry) => entry.revision) &&
        !data.externalModels.some((model) => model.candidates.length > 1)
      ) {
        commit.execute({
          ...input,
          source: { ...input.source, digest: data.digest },
          confirmedRevisions: {},
          modelSelections: Object.fromEntries(
            data.externalModels
              .filter((model) => model.selectedIdentifier)
              .map((model) => [
                model.sourceIdentifier,
                model.selectedIdentifier!,
              ]),
          ),
        });
      }
    },
  });
  const commit = useAction(importXRAG);
  const busy =
    inspection.isPending ||
    preview.isPending ||
    commit.isPending ||
    commit.hasSucceeded ||
    commit.hasErrored;
  function previewSingleton(
    data: NonNullable<typeof prepared>,
    selectedEntries: string[],
  ) {
    if (
      !data.isCollection &&
      data.entries.length === 1 &&
      !data.entries[0]!.needsWorkspace
    )
      preview.execute({
        source: { path: data.source.path, digest: data.digest },
        selectedEntries,
      });
  }
  const inspect = useEffectEvent(() => {
    if (started.current) return;
    started.current = true;
    if (initial)
      previewSingleton(
        initial,
        initial.entries.map((entry) => entry.archiveId),
      );
    else inspection.execute({ uploadId });
  });
  useEffect(() => {
    left.current = false;
    inspect();
    return () => {
      left.current = true;
    };
  }, [uploadId]);
  const contents = initial ?? inspection.result.data;
  const entries = commit.hasSucceeded ? [] : (contents?.entries ?? []);
  const { t: listLabel } = useT("settings", { keyPrefix: "resourceList" });
  const list = useGroupSortView(
    "/app/xrag/import",
    entries,
    undefined,
    preferences,
    { view: "cards" },
  );
  const showContents = entries.length > 0 && !inspection.isPending;
  const needsWorkspace = entries.some(
    (entry) => selected.includes(entry.archiveId) && entry.needsWorkspace,
  );
  const target = needsWorkspace
    ? workspaceId === "__new__"
      ? { workspaceId: newWorkspaceId, newWorkspaceName }
      : { workspaceId }
    : undefined;
  const source = contents
    ? {
        path: contents.source.path,
        digest: contents.digest,
      }
    : undefined;
  const externalModels = preview.result.data?.externalModels ?? [];
  const conflicts =
    preview.result.data?.entries.filter((entry) => entry.revision) ?? [];
  const unresolvedModels = externalModels.some(
    (model) =>
      model.candidates.length > 1 &&
      !modelSelections[model.sourceIdentifier] &&
      !model.selectedIdentifier,
  );
  function resetPreview() {
    preview.reset();
    setConfirmed({});
    setModelSelections({});
  }
  const error =
    inspection.hasErrored || preview.hasErrored || commit.hasErrored;
  return (
    <XRAGImportExport
      tab="import"
      options={
        showContents && (
          <ResourceListOptionsDropdown
            list={list}
            groups={[]}
            sorts={[]}
            views={[
              { value: "cards", label: listLabel("labelCards") },
              { value: "table", label: listLabel("labelTable") },
            ]}
          />
        )
      }
    >
      <FieldGroup>
        {contents && (
          <h2 className="max-w-full text-lg font-medium break-all">
            {contents.source.name}
          </h2>
        )}
        {inspection.isPending && (
          <p role="status">{t("descriptionInspecting")}</p>
        )}
        {showContents && (
          <>
            <XRAGImportContents
              entries={entries}
              selected={selected}
              view={list.view}
              disabled={busy}
              onChange={(ids) => {
                setSelected(ids);
                resetPreview();
              }}
            />
            {needsWorkspace && (
              <Field>
                <FieldLabel htmlFor={`${fieldId}-workspace`}>
                  {t("labelWorkspace")}
                </FieldLabel>
                <Select
                  value={workspaceId}
                  disabled={busy}
                  onValueChange={(value) => {
                    setWorkspaceId(value ?? "");
                    resetPreview();
                  }}
                >
                  <SelectTrigger id={`${fieldId}-workspace`}>
                    <SelectValue>
                      {workspaceId === "__new__"
                        ? t("labelNewWorkspace")
                        : (workspaces.find(
                            (workspace) => workspace.id === workspaceId,
                          )?.name ?? t("labelChooseWorkspace"))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {workspaces.map((workspace) => (
                        <SelectItem key={workspace.id} value={workspace.id}>
                          {workspace.name}
                        </SelectItem>
                      ))}
                      {isAdmin && (
                        <SelectItem value="__new__">
                          {t("labelNewWorkspace")}
                        </SelectItem>
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription className="text-xs">
                  {t("descriptionWorkspace")}
                </FieldDescription>
              </Field>
            )}
            {needsWorkspace && workspaceId === "__new__" && (
              <Field>
                <FieldLabel htmlFor={`${fieldId}-name`}>
                  {t("labelName")}
                </FieldLabel>
                <Input
                  id={`${fieldId}-name`}
                  value={newWorkspaceName}
                  disabled={busy}
                  onChange={(event) => {
                    setNewWorkspaceName(event.target.value);
                    resetPreview();
                  }}
                />
              </Field>
            )}
          </>
        )}
        {!commit.hasSucceeded &&
        preview.result.data &&
        (conflicts.length > 0 ||
          externalModels.some((model) => model.candidates.length > 1)) ? (
          <FieldGroup>
            {conflicts.length > 0 && (
              <FieldDescription>{t("descriptionConfirm")}</FieldDescription>
            )}
            {externalModels.map((model, index) => (
              <Field key={model.sourceIdentifier}>
                <FieldLabel htmlFor={`${fieldId}-external-model-${index}`}>
                  {model.provider
                    ? `${model.provider} · ${model.modelId}`
                    : model.modelId}
                </FieldLabel>
                {model.candidates.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      {t("descriptionModelMissing")}
                    </AlertDescription>
                  </Alert>
                ) : model.candidates.length === 1 ? (
                  <FieldDescription>
                    {t("descriptionModelMatched", {
                      name: model.candidates[0]!.name,
                    })}
                  </FieldDescription>
                ) : (
                  <>
                    <Select
                      disabled={busy}
                      value={modelSelections[model.sourceIdentifier] ?? ""}
                      onValueChange={(value) =>
                        setModelSelections((previous) => ({
                          ...previous,
                          [model.sourceIdentifier]: value ?? "",
                        }))
                      }
                    >
                      <SelectTrigger id={`${fieldId}-external-model-${index}`}>
                        <SelectValue>
                          {model.candidates.find(
                            (candidate) =>
                              candidate.identifier ===
                              modelSelections[model.sourceIdentifier],
                          )?.name ?? t("labelChooseExternalModel")}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {model.candidates.map((candidate) => (
                            <SelectItem
                              key={candidate.identifier}
                              value={candidate.identifier}
                            >
                              {candidate.name} · {candidate.identifier}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldDescription className="text-xs">
                      {t("descriptionChooseExternalModel")}
                    </FieldDescription>
                  </>
                )}
              </Field>
            ))}
            {conflicts.map((entry) => (
              <Field orientation="horizontal" key={entry.id}>
                <Checkbox
                  id={`${fieldId}-conflict-${entry.id}`}
                  disabled={busy}
                  checked={confirmed[entry.id] === entry.revision}
                  onCheckedChange={(checked) =>
                    setConfirmed((previous) => {
                      const next = { ...previous };
                      if (checked && entry.revision)
                        next[entry.id] = entry.revision;
                      else delete next[entry.id];
                      return next;
                    })
                  }
                />
                <FieldLabel htmlFor={`${fieldId}-conflict-${entry.id}`}>
                  {t("labelReplace", { name: entry.name })}
                </FieldLabel>
              </Field>
            ))}
            <ButtonAction
              disabled={
                busy ||
                !source ||
                unresolvedModels ||
                conflicts.some(
                  (entry) => confirmed[entry.id] !== entry.revision,
                )
              }
              isPending={commit.isPending}
              hasErrored={commit.hasErrored}
              onClick={() => {
                if (source && preview.result.data)
                  commit.execute({
                    source: {
                      ...source,
                      digest: preview.result.data.digest,
                    },
                    target,
                    selectedEntries: selected,
                    confirmedRevisions: confirmed,
                    ...(externalModels.length
                      ? {
                          modelSelections: Object.fromEntries(
                            externalModels
                              .filter(
                                (model) =>
                                  modelSelections[model.sourceIdentifier] ||
                                  model.selectedIdentifier,
                              )
                              .map((model) => [
                                model.sourceIdentifier,
                                modelSelections[model.sourceIdentifier] ??
                                  model.selectedIdentifier!,
                              ]),
                          ),
                        }
                      : {}),
                  });
              }}
            >
              {t("labelImport")}
            </ButtonAction>
          </FieldGroup>
        ) : (
          showContents && (
            <ButtonAction
              disabled={
                busy ||
                !source ||
                !selected.length ||
                (needsWorkspace &&
                  (!workspaceId ||
                    (workspaceId === "__new__" && !newWorkspaceName.trim())))
              }
              isPending={preview.isPending || commit.isPending}
              hasErrored={preview.hasErrored || commit.hasErrored}
              onClick={() => {
                setConfirmed({});
                setModelSelections({});
                if (source)
                  preview.execute({
                    source,
                    target,
                    selectedEntries: selected,
                  });
              }}
            >
              {t("labelImport")}
            </ButtonAction>
          )
        )}
        {commit.hasSucceeded && (
          <Alert>
            <AlertDescription>
              {t("descriptionImported")}
              {(commit.result.data?.documentFileCount ?? 0) > 0 && (
                <> {t("descriptionFilesProcessing")}</>
              )}
            </AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{t("errorAction")}</AlertDescription>
          </Alert>
        )}
        {(error || commit.hasSucceeded) && (
          <Button
            variant="outline"
            nativeButton={false}
            role="link"
            render={<Link href="/app/xrag/import" />}
          >
            <Paperclip />
            {t("labelAnotherUpload")}
          </Button>
        )}
      </FieldGroup>
    </XRAGImportExport>
  );
}
