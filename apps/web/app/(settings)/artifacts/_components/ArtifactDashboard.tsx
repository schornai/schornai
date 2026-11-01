"use client";
import { Fragment, useState } from "react";
import Link from "next/link";
import { useT } from "next-i18next/client";
import { useAction } from "next-safe-action/hooks";
import { Search, PackageOpen, Upload, X } from "lucide-react";
import { artifactTargets, xragSchemaSetup } from "xrag/schema";
import { currentSetupIds } from "xrag/setup";
import type { Artifact } from "@schornio/aibox-package-database/xrag/_schema";
import {
  NO_GROUP_KEY,
  toKey,
  useGroupSortView,
} from "@/lib/groupSortView/hook";
import type { Preferences } from "@/lib/groupSortView/types";
import { useFilter } from "@/lib/useFilter";
import { ResourceListOptionsDropdown } from "../../_components/ResourceListOptionsDropdown";
import {
  HeaderMain,
  HeaderMainContent,
  HeaderMainAsideContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ContainerTable } from "@schornio/aibox-package-ui/components/container-table";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "@schornio/aibox-package-ui/components/input-group";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { Badge } from "@schornio/aibox-package-ui/components/badge";
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@schornio/aibox-package-ui/components/alert-dialog";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@schornio/aibox-package-ui/components/empty";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@schornio/aibox-package-ui/components/table";
import {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
} from "@schornio/aibox-package-ui/components/attachment";
import { deleteArtifact } from "../_actions/deleteArtifact";
function DeleteArtifact({
  artifact,
  latestSetup,
}: {
  artifact: Artifact;
  latestSetup: boolean;
}) {
  const { t } = useT("settings", { keyPrefix: "artifacts" });
  const [open, setOpen] = useState(false);
  const action = useAction(deleteArtifact, { onSuccess: () => setOpen(false) });
  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!action.isPending || value) {
          setOpen(value);
          if (!value) action.reset();
        }
      }}
    >
      <AlertDialogTrigger
        render={
          <Button
            size="icon"
            variant="destructive"
            aria-label={t("labelDeleteNamed", { name: artifact.name })}
          >
            <X />
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("labelDeleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("descriptionDelete", { name: artifact.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {latestSetup && (
          <Alert>
            <AlertDescription>{t("descriptionDeleteLatest")}</AlertDescription>
          </Alert>
        )}
        {action.hasErrored && (
          <Alert variant="destructive">
            <AlertDescription>{t("errorDelete")}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={action.isPending}>
            {t("labelCancel")}
          </AlertDialogCancel>
          <ButtonAction
            variant="destructive"
            isPending={action.isPending}
            hasErrored={action.hasErrored}
            onClick={() => action.execute({ id: artifact.id })}
          >
            <X />
            {t("labelDelete")}
          </ButtonAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ArtifactDashboard({
  artifacts,
  connected = true,
  userPreferences,
}: {
  artifacts: Artifact[];
  connected?: boolean;
  userPreferences?: Preferences;
}) {
  const { t, i18n } = useT("settings", { keyPrefix: "artifacts" });
  const { t: optionsT } = useT("settings", { keyPrefix: "resourceList" });
  const locale = i18n.language;
  const number = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
  const bytes = (value: number) => {
    const unit =
      value >= 1024 ** 3 ? "GiB" : value >= 1024 ** 2 ? "MiB" : "KiB";
    return `${number(value / (unit === "GiB" ? 1024 ** 3 : unit === "MiB" ? 1024 ** 2 : 1024))} ${unit}`;
  };
  const date = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));

  const visible = artifacts.filter((artifact) => !artifact.purgedAt);
  const latest = currentSetupIds(artifacts);
  const statusKey = (artifact: Artifact) =>
    artifact.deletedAt
      ? "labelCleanupPending"
      : latest.has(artifact.id)
        ? "labelCurrentSetup"
        : "labelPublished";
  const typeLabel = (artifact: Artifact) =>
    t(`type.${artifact.xrag.xrag_type}`, {
      defaultValue: artifact.xrag.xrag_type,
    });
  const targetLabel = (role: string) =>
    role === "service" ? t("labelAllServices") : role;
  const targets = (artifact: Artifact) => {
    const setup = xragSchemaSetup.safeParse(artifact.xrag);
    if (setup.success && (setup.data.platform || setup.data.arch))
      return t("labelServicesForPlatform", {
        platform: setup.data.platform ?? "*",
        arch: setup.data.arch ?? "*",
      });
    return (
      artifactTargets(artifact.xrag).map(targetLabel).join(", ") ||
      t("labelOtherRecipients")
    );
  };
  const { filter, setFilter, filteredData } = useFilter(visible, {
    keys: ["name", "xrag.xrag_type", "xrag.targets"],
  });
  const list = useGroupSortView<
    Artifact,
    "type" | "target" | "state" | "first-letter" | "no-group",
    "name" | "size" | "createdAt",
    "tiles" | "table"
  >(
    "/artifacts",
    filteredData,
    {
      group: (group, artifact) => {
        switch (group) {
          case "type":
            return artifact.xrag.xrag_type;
          case "target":
            return new Set(artifactTargets(artifact.xrag));
          case "state":
            return statusKey(artifact);
          case "first-letter":
            return artifact.name.trim().charAt(0).toUpperCase();
          default:
            return NO_GROUP_KEY;
        }
      },
      groupSort: (_group, a, b) => a.localeCompare(b),
      sort: (sort, a, b) =>
        sort === "size"
          ? a.size - b.size
          : sort === "name"
            ? a.name.localeCompare(b.name)
            : a.createdAt.localeCompare(b.createdAt),
    },
    userPreferences,
    { group: "no-group", sort: "createdAt:desc", view: "table" },
  );
  const grouped = list.group && list.group !== "no-group";
  const groupLabel = (key: string | symbol) =>
    key === NO_GROUP_KEY
      ? t("labelOtherRecipients")
      : list.group === "type"
        ? t(`type.${String(key)}`, { defaultValue: String(key) })
        : list.group === "target"
          ? targetLabel(String(key))
          : list.group === "state"
            ? t(String(key))
            : String(key);
  const badge = (artifact: Artifact) => (
    <Badge variant={artifact.deletedAt ? "destructive" : "outline"}>
      {t(statusKey(artifact))}
    </Badge>
  );
  const remove = (artifact: Artifact) => (
    <DeleteArtifact artifact={artifact} latestSetup={latest.has(artifact.id)} />
  );
  return (
    <>
      <HeaderMain>
        <HeaderMainContent>
          <PackageOpen />
          {t("labelTitle")}
        </HeaderMainContent>
        <HeaderMainAsideContent>
          <ResourceListOptionsDropdown
            list={list}
            groups={[
              { value: "no-group", label: optionsT("labelNoGroup") },
              { value: "type", label: t("labelType") },
              { value: "target", label: t("labelTargets") },
              { value: "state", label: t("labelStatus") },
              { value: "first-letter", label: optionsT("labelFirstLetter") },
            ]}
            sorts={[
              { value: "name:asc", label: optionsT("labelNameAsc") },
              { value: "name:desc", label: optionsT("labelNameDesc") },
              { value: "createdAt:desc", label: t("labelNewest") },
              { value: "createdAt:asc", label: t("labelOldest") },
              { value: "size:desc", label: t("labelLargest") },
              { value: "size:asc", label: t("labelSmallest") },
            ]}
            views={[
              { value: "table", label: optionsT("labelTable") },
              { value: "tiles", label: optionsT("labelTiles") },
            ]}
          />
        </HeaderMainAsideContent>
      </HeaderMain>
      <ContainerMain className="flex flex-col gap-6">
        {!connected && (
          <Alert>
            <AlertDescription>{t("descriptionDisconnected")}</AlertDescription>
          </Alert>
        )}
        <p className="text-muted-foreground text-sm">
          {t("descriptionArtifacts")}
        </p>
        <div className="flex justify-center">
          <InputGroup className="max-w-sm">
            <InputGroupInput
              aria-label={t("labelSearch")}
              placeholder={t("labelSearch")}
              value={filter ?? ""}
              onChange={(event) => setFilter(event.currentTarget.value)}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>
        </div>
        {artifacts.some(
          (artifact) => latest.has(artifact.id) && artifact.deletedAt,
        ) && (
          <Alert>
            <AlertDescription>
              {t("descriptionSetupWithdrawn")}
            </AlertDescription>
          </Alert>
        )}
        {list.itemGroups.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PackageOpen />
              </EmptyMedia>
              <EmptyTitle>
                {visible.length
                  ? optionsT("labelNoResults")
                  : t("labelNoArtifacts")}
              </EmptyTitle>
              {visible.length > 0 && (
                <EmptyDescription>
                  {optionsT("descriptionNoResults")}
                </EmptyDescription>
              )}
            </EmptyHeader>
            {visible.length === 0 && (
              <EmptyContent>
                <Button
                  nativeButton={false}
                  render={<Link href="/settings/xrag" />}
                  variant="outline"
                >
                  <Upload data-icon="inline-start" />
                  {t("labelUploadXRAG")}
                </Button>
              </EmptyContent>
            )}
          </Empty>
        ) : list.view === "tiles" ? (
          list.itemGroups.map(([key, items]) => (
            <section key={toKey(key)} className="flex flex-col gap-3">
              {grouped && (
                <h2 className="text-lg font-semibold">{groupLabel(key)}</h2>
              )}
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {items.map((artifact) => (
                  <Attachment
                    key={artifact.id}
                    className="w-full"
                    state={artifact.deletedAt ? "error" : "done"}
                  >
                    <AttachmentMedia>
                      <PackageOpen />
                    </AttachmentMedia>
                    <AttachmentContent>
                      <AttachmentTitle title={artifact.name}>
                        {artifact.name}
                      </AttachmentTitle>
                      <AttachmentDescription title={typeLabel(artifact)}>
                        {typeLabel(artifact)} · {bytes(artifact.size)}
                      </AttachmentDescription>
                      <AttachmentDescription title={targets(artifact)}>
                        {targets(artifact)}
                      </AttachmentDescription>
                      <AttachmentDescription>
                        {date(artifact.createdAt)}
                      </AttachmentDescription>
                      <div className="mt-2">{badge(artifact)}</div>
                    </AttachmentContent>
                    <AttachmentActions>{remove(artifact)}</AttachmentActions>
                  </Attachment>
                ))}
              </div>
            </section>
          ))
        ) : (
          <ContainerTable>
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    "labelName",
                    "labelType",
                    "labelTargets",
                    "labelSize",
                    "labelPublished",
                    "labelStatus",
                  ].map((key) => (
                    <TableHead key={key}>{t(key)}</TableHead>
                  ))}
                  <TableHead>
                    <span className="sr-only">{t("labelDelete")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.itemGroups.map(([key, items]) => (
                  <Fragment key={toKey(key)}>
                    {grouped && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted font-medium">
                          {groupLabel(key)}
                        </TableCell>
                      </TableRow>
                    )}
                    {items.map((artifact) => (
                      <TableRow key={artifact.id}>
                        <TableCell>{artifact.name}</TableCell>
                        <TableCell>{typeLabel(artifact)}</TableCell>
                        <TableCell>{targets(artifact)}</TableCell>
                        <TableCell>{bytes(artifact.size)}</TableCell>
                        <TableCell>{date(artifact.createdAt)}</TableCell>
                        <TableCell>{badge(artifact)}</TableCell>
                        <TableCell>{remove(artifact)}</TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </ContainerTable>
        )}
      </ContainerMain>
    </>
  );
}
