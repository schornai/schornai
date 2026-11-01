"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@schornio/aibox-package-ui/components/select";
import { AgentConnectionSelect } from "./AgentConnectionSelect";
import { useId, useState } from "react";
import { XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import {
  defaultWebAccess,
  normalizeWebDomain,
  type WebAccessConfig,
} from "@schornio/aibox-package-database/agent/webAccess";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@schornio/aibox-package-ui/components/field";
import { Textarea } from "@schornio/aibox-package-ui/components/textarea";
import { Switch } from "@schornio/aibox-package-ui/components/switch";

import { ButtonDiscardChanges } from "@schornio/aibox-package-ui/components/button-discard-changes";
import { Button } from "@schornio/aibox-package-ui/components/button";
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
import { AlertDialogMediaDestructive } from "@schornio/aibox-package-ui/components/alert-dialog-media-destructive";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { useAgentEditor } from "./AgentEditor";

export function AgentEditorRoleWebAccess({
  role,
}: {
  role: Agent["roles"][number];
}) {
  const { relations, defaultAgent, setAgentRole } = useAgentEditor();
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentEditorRoleWebAccess",
  });
  const id = useId();
  const router = useRouter();
  const [removeOpen, setRemoveOpen] = useState(false);
  const config = role.toolWebAccess ?? defaultWebAccess;
  const original = defaultAgent?.roles?.find(
    (item) => item.id === role.id,
  )?.toolWebAccess;
  const fetchEnabled =
    config.active && ["on", "ask"].includes(config.webFetch ?? "off");
  const searchEnabled =
    config.active && ["on", "ask"].includes(config.webSearch ?? "off");
  const update = (patch: Partial<WebAccessConfig>) =>
    setAgentRole(role.id, (prev) => ({
      ...prev,
      toolWebAccess: { ...defaultWebAccess, ...prev.toolWebAccess, ...patch },
    }));
  const invalidDomains = config.webFetchAllowList.some(
    (domain) => !normalizeWebDomain(domain),
  );

  return (
    <ContainerMain>
      <FieldGroup>
        <FieldSet>
          <FieldLegend>
            {t("labelTitle")}{" "}
            <ButtonDiscardChanges
              objA={original}
              objB={role.toolWebAccess}
              onClick={() => {
                setAgentRole(role.id, (prev) => ({
                  ...prev,
                  toolWebAccess: original,
                }));
                if (!original) router.push(`?view=roles#role-${role.id}`);
              }}
              variant="inline"
            />
          </FieldLegend>
          <FieldDescription>{t("description")}</FieldDescription>
          <FieldGroup>
            <Field orientation="horizontal">
              <Switch
                id={`${id}-fetch`}
                checked={fetchEnabled}
                onCheckedChange={(checked) =>
                  update({
                    active: true,
                    webFetch: checked ? "on" : "off",
                    ...(!config.active ? { webSearch: "off" } : {}),
                  })
                }
              />
              <FieldLabel htmlFor={`${id}-fetch`}>{t("labelFetch")}</FieldLabel>
            </Field>
            {fetchEnabled && (
              <>
                <Field orientation="horizontal">
                  <Switch
                    id={`${id}-fetch-ask`}
                    checked={config.webFetch === "ask"}
                    onCheckedChange={(checked) =>
                      update({ webFetch: checked ? "ask" : "on" })
                    }
                  />
                  <FieldLabel htmlFor={`${id}-fetch-ask`}>
                    {t("labelAskFetch")}
                  </FieldLabel>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${id}-access`}>
                    {t("labelAccess")}
                  </FieldLabel>
                  <Select
                    value={config.webFetchAccess}
                    items={[
                      { value: "allow-all", label: t("labelAll") },
                      { value: "allow-list", label: t("labelWhitelist") },
                    ]}
                    onValueChange={(value) =>
                      value &&
                      update({
                        webFetchAccess:
                          value as WebAccessConfig["webFetchAccess"],
                      })
                    }
                  >
                    <SelectTrigger id={`${id}-access`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="allow-all">
                          {t("labelAll")}
                        </SelectItem>
                        <SelectItem value="allow-list">
                          {t("labelWhitelist")}
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription>{t("descriptionAccess")}</FieldDescription>
                </Field>
                {config.webFetchAccess === "allow-list" && (
                  <Field data-invalid={invalidDomains}>
                    <FieldLabel htmlFor={`${id}-domains`}>
                      {t("labelDomains")}
                    </FieldLabel>
                    <Textarea
                      id={`${id}-domains`}
                      aria-invalid={invalidDomains}
                      value={config.webFetchAllowList.join("\n")}
                      onChange={(event) =>
                        update({
                          webFetchAllowList: event.target.value.split("\n"),
                        })
                      }
                      onBlur={() =>
                        update({
                          webFetchAllowList: config.webFetchAllowList
                            .map((domain) => domain.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                    <FieldDescription>
                      {t("descriptionDomains")}
                    </FieldDescription>
                    {invalidDomains && (
                      <FieldError>{t("errorDomains")}</FieldError>
                    )}
                    {config.webFetchAllowList.filter((domain) => domain.trim())
                      .length === 0 && (
                      <FieldDescription>
                        {t("descriptionEmptyWhitelist")}
                      </FieldDescription>
                    )}
                  </Field>
                )}
              </>
            )}
          </FieldGroup>
        </FieldSet>
        <FieldSet>
          <FieldLegend>{t("labelSearchTitle")}</FieldLegend>
          <FieldGroup>
            <Field orientation="horizontal">
              <Switch
                id={`${id}-search`}
                checked={searchEnabled}
                onCheckedChange={(checked) =>
                  update({
                    active: true,
                    webSearch: checked ? "on" : "off",
                    ...(!config.active ? { webFetch: "off" } : {}),
                  })
                }
              />
              <FieldLabel htmlFor={`${id}-search`}>
                {t("labelSearch")}
              </FieldLabel>
            </Field>
            {searchEnabled && (
              <>
                <Field orientation="horizontal">
                  <Switch
                    id={`${id}-search-ask`}
                    checked={config.webSearch === "ask"}
                    onCheckedChange={(checked) =>
                      update({ webSearch: checked ? "ask" : "on" })
                    }
                  />
                  <FieldLabel htmlFor={`${id}-search-ask`}>
                    {t("labelAskSearch")}
                  </FieldLabel>
                </Field>
                <AgentConnectionSelect
                  connections={relations.connections}
                  kind="search"
                  value={config.webSearchConnectionId}
                  onChange={(webSearchConnectionId, connection) =>
                    update({
                      webSearchConnectionId,
                      webSearchProvider:
                        connection?.kind === "brave"
                          ? "brave"
                          : connection?.kind === "staan"
                            ? "staan"
                            : undefined,
                    })
                  }
                />
              </>
            )}
          </FieldGroup>
        </FieldSet>
        <Field orientation="horizontal">
          <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
            <AlertDialogTrigger
              render={
                <Button type="button" variant="destructive">
                  {t("labelRemoveTool")}
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogMediaDestructive>
                  <XCircle />
                </AlertDialogMediaDestructive>
                <AlertDialogTitle>
                  {t("labelConfirmRemoveTool")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("descriptionRemoveTool")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("labelCancel")}</AlertDialogCancel>
                <AlertDialogAction
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setRemoveOpen(false);
                    setAgentRole(role.id, (prev) => ({
                      ...prev,
                      toolWebAccess: undefined,
                    }));
                    router.push(`?view=roles#role-${role.id}`);
                  }}
                >
                  {t("labelRemoveTool")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Field>
      </FieldGroup>
    </ContainerMain>
  );
}
