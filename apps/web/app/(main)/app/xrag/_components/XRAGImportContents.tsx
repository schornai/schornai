"use client";

import { useT } from "next-i18next/client";
import {
  Zap,
  AudioLines,
  Brain,
  BotMessageSquare,
  FolderOpen,
  PackageOpen,
  SquareMinus,
  SquarePlus,
} from "lucide-react";
import type { inspectXRAGTransfer } from "@schornio/aibox-package-database/xrag/inspectXRAGTransfer";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { Checkbox } from "@schornio/aibox-package-ui/components/checkbox";
import {
  CardApp,
  CardAppHeader,
  CardAppMain,
  CardAppAvatar,
  CardAppContent,
  CardAppName,
  CardAppDescription,
} from "@schornio/aibox-package-ui/components/card-app";
import { ContainerTable } from "@schornio/aibox-package-ui/components/container-table";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@schornio/aibox-package-ui/components/table";
import { SelectableResourceCard } from "../../../../_components/SelectableResourceCard";

const kinds = {
  automation: [Zap, "zap"],
  agent: [BotMessageSquare, "bot-message-square"],
  documentRepository: [FolderOpen, "folder-open"],
  transcriber: [AudioLines, "audio-lines"],
  ollamaModel: [Brain, "brain"],
  mlxWhisperModel: [AudioLines, "audio-lines"],
  setup: [PackageOpen, "package-open"],
  files: [FolderOpen, "folder-open"],
} as const;

export function XRAGImportContents({
  entries,
  selected,
  view,
  disabled,
  onChange,
}: {
  entries: Awaited<ReturnType<typeof inspectXRAGTransfer>>["entries"];
  selected: string[];
  view: string | undefined;
  disabled: boolean;
  onChange: (ids: string[]) => void;
}) {
  const { t } = useT("common", { keyPrefix: "_components.XRAGTransfer" });
  const all = selected.length === entries.length;
  const toggle = (id: string) =>
    onChange(
      selected.includes(id)
        ? selected.filter((value) => value !== id)
        : [...selected, id],
    );
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">{t("labelContent")}</h3>
        <Button
          size="xs"
          variant="outline"
          disabled={disabled}
          onClick={() =>
            onChange(all ? [] : entries.map((entry) => entry.archiveId))
          }
        >
          {all ? <SquareMinus /> : <SquarePlus />}
          {t(all ? "labelSelectNone" : "labelSelectAll")}
        </Button>
      </div>
      {view === "table" ? (
        <ContainerTable>
          <Table aria-label={t("labelContent")}>
            <TableHeader>
              <TableRow>
                <TableHead>{t("labelSelection")}</TableHead>
                <TableHead>{t("labelObjectName")}</TableHead>
                <TableHead>{t("labelObjectKind")}</TableHead>
                <TableHead>{t("labelObjectDescription")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow
                  key={entry.archiveId}
                  data-state={
                    selected.includes(entry.archiveId) ? "selected" : undefined
                  }
                >
                  <TableCell>
                    <Checkbox
                      checked={selected.includes(entry.archiveId)}
                      disabled={disabled}
                      onCheckedChange={() => toggle(entry.archiveId)}
                      aria-label={t("labelSelectObject", { name: entry.name })}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{entry.name}</TableCell>
                  <TableCell>{t(`kind.${entry.kind}`)}</TableCell>
                  <TableCell className="whitespace-normal">
                    {entry.description}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ContainerTable>
      ) : (
        <div className="flex flex-wrap items-start gap-4">
          {entries.map((entry) => {
            const [Icon, iconName] =
              kinds[entry.kind as keyof typeof kinds] ?? kinds.setup;
            return (
              <SelectableResourceCard
                key={entry.archiveId}
                name={entry.name}
                selected={selected.includes(entry.archiveId)}
                disabled={disabled}
                onSelect={() => toggle(entry.archiveId)}
              >
                <CardApp appColor={entry.color}>
                  <CardAppHeader>
                    <Icon />
                    {t(`kind.${entry.kind}`)}
                  </CardAppHeader>
                  <CardAppMain>
                    <CardAppAvatar
                      icon={entry.icon ?? { type: "icon-lucide", iconName }}
                    />
                    <CardAppContent>
                      <CardAppName>{entry.name}</CardAppName>
                      <CardAppDescription>
                        {entry.description}
                      </CardAppDescription>
                    </CardAppContent>
                  </CardAppMain>
                </CardApp>
              </SelectableResourceCard>
            );
          })}
        </div>
      )}
    </>
  );
}
