"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@schornio/aibox-package-ui/components/alert-dialog";
import { ArrowRight, XCircle } from "lucide-react";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@schornio/aibox-package-ui/components/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@schornio/aibox-package-ui/components/select";
import { useEffect, useId } from "react";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import { AlertDialogMediaDestructive } from "@schornio/aibox-package-ui/components/alert-dialog-media-destructive";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonDiscardChanges } from "@schornio/aibox-package-ui/components/button-discard-changes";
import { CodeInline } from "@schornio/aibox-package-ui/components/code-inline";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { Fragment } from "react/jsx-runtime";
import { Input } from "@schornio/aibox-package-ui/components/input";
import type { SetStateAction } from "react";
import { useAgentEditor } from "./AgentEditor";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";

export function AgentEditorRoleDocumentRepositoryMounts({
  documentRepositoryMounts,
  roleId,
}: {
  documentRepositoryMounts: Agent["roles"][number]["documentRepositoryMounts"];
  roleId: string;
}) {
  const selectDocumentRepositoryIdentifierId = useId();
  const inputMountId = useId();
  const inputPathRepositoryId = useId();
  const selectPermissionId = useId();

  const router = useRouter();
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentEditorRoleDocumentRepositoryMounts",
  });
  const { agent, defaultAgent, relations, setAgentRole } = useAgentEditor();

  useEffect(() => {
    if (documentRepositoryMounts.length === 0) {
      router.push("?view=roles");
    }
  }, [documentRepositoryMounts.length, router]);

  const setAgentRoleDocumentRepositoryMount = (
    mountId: string,
    action: SetStateAction<
      Agent["roles"][number]["documentRepositoryMounts"][number]
    >,
  ) => {
    setAgentRole(roleId, (prev) => ({
      ...prev,
      documentRepositoryMounts: prev.documentRepositoryMounts?.map((mount) => {
        if (mount.id === mountId) {
          if (typeof action === "function") {
            return action(mount);
          }
          return action;
        }
        return mount;
      }),
    }));
  };

  const documentRepositoryItems = relations.documentRepositories.map(
    (repo) => ({
      group: repo.workspaceId,
      label: repo.name,
      value: repo.identifier,
    }),
  );
  const documentRepositoryItemGroups = Object.entries(
    Object.groupBy(documentRepositoryItems, (item) =>
      item.group ? `group-${item.group}` : "unknown",
    ),
  ).toSorted(([a], [b]) => {
    if (a === b) {
      return 0;
    }

    if (a === agent?.workspaceId) {
      return 1;
    }

    if (b === agent?.workspaceId) {
      return -1;
    }

    return a.localeCompare(b);
  });

  const doucmentRepositoryMount = new Map(
    relations.documentRepositories.map((repo) => [repo.identifier, repo]),
  );

  const defaultRole = defaultAgent?.roles?.find(($) => $.id === roleId);

  const permissionItems = [
    {
      label: t("labelReadOnly"),
      value: "read-only",
    },
    {
      label: t("labelConfirmWrite"),
      value: "confirm-write",
    },
    {
      label: t("labelWrite"),
      value: "write",
    },
  ];

  const workspaceMap = new Map(
    relations.workspaces.map((workspace) => [workspace.id, workspace]),
  );

  return (
    <ContainerMain>
      {documentRepositoryMounts.map((mount) => (
        <Fragment key={mount.id}>
          <FieldGroup>
            <Field>
              <FieldLabel
                htmlFor={`${mount.id}-${selectDocumentRepositoryIdentifierId}`}
              >
                {t("labelRepository")}
                <ButtonDiscardChanges
                  objA={
                    defaultRole?.documentRepositoryMounts.find(
                      ($) => $.id === mount.id,
                    )?.documentRepositoryIdentifier ?? ""
                  }
                  objB={mount.documentRepositoryIdentifier}
                  onClick={() =>
                    setAgentRoleDocumentRepositoryMount(mount.id, (prev) => ({
                      ...prev,
                      documentRepositoryIdentifier:
                        defaultRole?.documentRepositoryMounts.find(
                          ($) => $.id === mount.id,
                        )?.documentRepositoryIdentifier ?? "",
                    }))
                  }
                  variant="inline"
                />
              </FieldLabel>
              <Select
                id={`${mount.id}-${selectDocumentRepositoryIdentifierId}`}
                items={documentRepositoryItems}
                onValueChange={(identifier: string | null) =>
                  setAgentRoleDocumentRepositoryMount(mount.id, (prev) => ({
                    ...prev,
                    documentRepositoryIdentifier: identifier ?? "unknown",
                  }))
                }
                value={mount.documentRepositoryIdentifier}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentRepositoryItemGroups.map(([group, items]) => (
                    <SelectGroup key={group}>
                      <SelectLabel>
                        {workspaceMap.get(group.replace("group-", ""))?.name ??
                          t("labelUnknownRepository")}
                      </SelectLabel>

                      {items?.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3">
              <Field>
                <FieldLabel htmlFor={`${mount.id}-${inputMountId}`}>
                  {t("labelPathAgent")}
                  <ButtonDiscardChanges
                    objA={
                      defaultRole?.documentRepositoryMounts.find(
                        ($) => $.id === mount.id,
                      )?.mount ?? "/"
                    }
                    objB={mount.mount}
                    onClick={() =>
                      setAgentRoleDocumentRepositoryMount(mount.id, (prev) => ({
                        ...prev,
                        mount:
                          defaultRole?.documentRepositoryMounts.find(
                            ($) => $.id === mount.id,
                          )?.mount ?? "/",
                      }))
                    }
                    variant="inline"
                  />
                </FieldLabel>
                <Input
                  id={`${mount.id}-${inputMountId}`}
                  onChange={({ currentTarget: { value } }) =>
                    setAgentRoleDocumentRepositoryMount(mount.id, (prev) => ({
                      ...prev,
                      mount: value,
                    }))
                  }
                  value={mount.mount}
                />
              </Field>
              <ArrowRight className="size-6 self-center" />
              <Field>
                <FieldLabel htmlFor={`${mount.id}-${inputPathRepositoryId}`}>
                  {t("labelPathRepository")}
                  <ButtonDiscardChanges
                    objA={
                      defaultRole?.documentRepositoryMounts.find(
                        ($) => $.id === mount.id,
                      )?.pathRepository ?? "/"
                    }
                    objB={mount.pathRepository}
                    onClick={() =>
                      setAgentRoleDocumentRepositoryMount(mount.id, (prev) => ({
                        ...prev,
                        pathRepository:
                          defaultRole?.documentRepositoryMounts.find(
                            ($) => $.id === mount.id,
                          )?.pathRepository ?? "/",
                      }))
                    }
                    variant="inline"
                  />
                </FieldLabel>
                <Input
                  id={`${mount.id}-${inputPathRepositoryId}`}
                  onChange={({ currentTarget: { value } }) =>
                    setAgentRoleDocumentRepositoryMount(mount.id, (prev) => ({
                      ...prev,
                      pathRepository: value,
                    }))
                  }
                  value={mount.pathRepository}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={`${mount.id}-${selectPermissionId}`}>
                {t("labelPermission")}
                <ButtonDiscardChanges
                  objA={
                    defaultRole?.documentRepositoryMounts.find(
                      ($) => $.id === mount.id,
                    )?.permission ?? "read-only"
                  }
                  objB={mount.permission}
                  onClick={() =>
                    setAgentRoleDocumentRepositoryMount(mount.id, (prev) => ({
                      ...prev,
                      permission:
                        defaultRole?.documentRepositoryMounts.find(
                          ($) => $.id === mount.id,
                        )?.permission ?? "read-only",
                    }))
                  }
                  variant="inline"
                />
              </FieldLabel>
              <Select
                id={`${mount.id}-${selectPermissionId}`}
                items={permissionItems}
                onValueChange={(permission: string | null) =>
                  setAgentRoleDocumentRepositoryMount(mount.id, (prev) => ({
                    ...prev,
                    permission:
                      (permission as Agent["roles"][number]["documentRepositoryMounts"][number]["permission"]) ??
                      "read-only",
                  }))
                }
                value={mount.permission}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {permissionItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <div className="ml-auto">
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button variant="destructive">
                      {t("labelDeleteConnection")}
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogMediaDestructive>
                      <XCircle />
                    </AlertDialogMediaDestructive>
                    <AlertDialogTitle>
                      {t("confirmDeleteTitle")}
                    </AlertDialogTitle>
                    <AlertDialogDescription render={<div />}>
                      {t("confirmDeleteDescription", {
                        name:
                          doucmentRepositoryMount.get(
                            mount.documentRepositoryIdentifier,
                          )?.name ?? t("labelUnknownRepository"),
                      })}
                      <div className="flex flex-wrap items-center gap-1">
                        <CodeInline>{mount.mount}</CodeInline>{" "}
                        <ArrowRight className="size-4" />{" "}
                        <CodeInline>{mount.pathRepository}</CodeInline>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("labelCancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        setAgentRole(roleId, (role) => ({
                          ...role,
                          documentRepositoryMounts:
                            role.documentRepositoryMounts?.filter(
                              ($) => $.id !== mount.id,
                            ),
                        }));
                      }}
                      variant="destructive"
                    >
                      {t("labelDeleteConnection")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </FieldGroup>
          <hr className="my-5 border-dashed" />
        </Fragment>
      ))}
      <Button
        onClick={() => {
          setAgentRole(roleId, (role) => ({
            ...role,
            documentRepositoryMounts: [
              ...(role.documentRepositoryMounts ?? []),
              {
                documentRepositoryIdentifier: "",
                id: crypto.randomUUID(),
                mount: "/",
                pathRepository: "/",
                permission: "read-only",
              },
            ],
          }));
        }}
        size="sm"
      >
        {t("labelAddConnection")}
      </Button>
    </ContainerMain>
  );
}
