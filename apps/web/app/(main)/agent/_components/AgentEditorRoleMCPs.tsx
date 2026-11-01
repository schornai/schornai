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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@schornio/aibox-package-ui/components/field";
import { AgentConnectionSelect } from "./AgentConnectionSelect";
import { Fragment, useEffect, useId, useState } from "react";
import { X, XCircle, KeyRound } from "lucide-react";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import { AlertDialogMediaDestructive } from "@schornio/aibox-package-ui/components/alert-dialog-media-destructive";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonDiscardChanges } from "@schornio/aibox-package-ui/components/button-discard-changes";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { Input } from "@schornio/aibox-package-ui/components/input";
import type { SetStateAction } from "react";
import { useAgentEditor } from "./AgentEditor";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";

export function AgentEditorRoleMCPs({
  mcps,
  roleId,
  roleIndex,
}: {
  mcps: Agent["roles"][number]["mcps"];
  roleId: string;
  roleIndex: number;
}) {
  const [oauthExpanded, setOAuthExpanded] = useState<Record<string, boolean>>(
    {},
  );
  const oauthPanelId = useId();
  const nameInputId = useId();
  const urlInputId = useId();
  const headerInputIdPrefix = useId();

  const { t } = useT("agent", { keyPrefix: "_components.AgentEditorRoleMCPs" });

  const router = useRouter();
  const { relations, defaultAgent, setAgentRole, hasValidationError } =
    useAgentEditor();

  const [currentHTTPHeaderKey, setCurrentHTTPHeaderKey] = useState<
    string | undefined
  >();
  const [currentHTTPHeaderKeyValue, setCurrentHTTPHeaderKeyValue] =
    useState("");

  useEffect(() => {
    if ((mcps?.length ?? 0) === 0) {
      router.push("?view=roles");
    }
  }, [mcps?.length, router]);

  const setAgentRoleMCP = (
    mcpId: string,
    action: SetStateAction<NonNullable<Agent["roles"][number]["mcps"]>[number]>,
  ) => {
    setAgentRole(roleId, (prev) => ({
      ...prev,
      mcps: prev.mcps?.map((mcp) => {
        if (mcp.id === mcpId) {
          if (typeof action === "function") {
            return action(mcp);
          }
          return action;
        }
        return mcp;
      }),
    }));
  };

  const defaultRole = defaultAgent?.roles?.find(($) => $.id === roleId);

  return (
    <ContainerMain>
      {mcps?.map((mcp, mcpIndex) => (
        <Fragment key={mcp.id}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${mcp.id}-${nameInputId}`}>
                {t("labelName")}{" "}
                <ButtonDiscardChanges
                  objA={
                    defaultRole?.mcps?.find(($) => $.id === mcp.id)?.name ?? ""
                  }
                  objB={mcp.name ?? ""}
                  onClick={() =>
                    setAgentRoleMCP(mcp.id, (prev) => ({
                      ...prev,
                      name:
                        defaultRole?.mcps?.find(($) => $.id === mcp.id)?.name ??
                        "",
                    }))
                  }
                  variant="inline"
                />
              </FieldLabel>
              <Input
                id={`${mcp.id}-${nameInputId}`}
                onChange={({ currentTarget: { value } }) =>
                  setAgentRoleMCP(mcp.id, (prev) => ({
                    ...prev,
                    name: value,
                  }))
                }
                value={mcp.name ?? ""}
              />
            </Field>
            <Field
              data-invalid={hasValidationError(
                "roles",
                roleIndex,
                "mcps",
                mcpIndex,
                "url",
              )}
            >
              <FieldLabel htmlFor={`${mcp.id}-${urlInputId}`}>
                {t("labelUrl")}{" "}
                <ButtonDiscardChanges
                  objA={
                    defaultRole?.mcps?.find(($) => $.id === mcp.id)?.url ?? ""
                  }
                  objB={mcp.url}
                  onClick={() =>
                    setAgentRoleMCP(mcp.id, (prev) => ({
                      ...prev,
                      url:
                        defaultRole?.mcps?.find(($) => $.id === mcp.id)?.url ??
                        "",
                    }))
                  }
                  variant="inline"
                />
              </FieldLabel>
              <Input
                aria-invalid={hasValidationError(
                  "roles",
                  roleIndex,
                  "mcps",
                  mcpIndex,
                  "url",
                )}
                id={`${mcp.id}-${urlInputId}`}
                onChange={({ currentTarget: { value } }) =>
                  setAgentRoleMCP(mcp.id, (prev) => ({ ...prev, url: value }))
                }
                value={mcp.url ?? ""}
              />
              {hasValidationError(
                "roles",
                roleIndex,
                "mcps",
                mcpIndex,
                "url",
              ) ? (
                <FieldError>{t("errorInvalidUrl")}</FieldError>
              ) : undefined}
            </Field>
            {(oauthExpanded[mcp.id] ?? !!mcp.oauthConnectionId) && (
              <div id={`${oauthPanelId}-${mcp.id}`}>
                <AgentConnectionSelect
                  connections={relations.connections}
                  kind="oauth"
                  value={mcp.oauthConnectionId}
                  onChange={(oauthConnectionId) =>
                    setAgentRoleMCP(mcp.id, (prev) => ({
                      ...prev,
                      oauthConnectionId,
                    }))
                  }
                />
              </div>
            )}
            {Object.keys(mcp.headers).length > 0 ? (
              <div className="bg-muted flex flex-col gap-3 rounded-md p-3">
                <h4 className="font-medium">
                  {t("labelHTTPHeaders")}{" "}
                  <ButtonDiscardChanges
                    objA={
                      defaultRole?.mcps?.find(($) => $.id === mcp.id)
                        ?.headers ?? {}
                    }
                    objB={mcp.headers}
                    onClick={() =>
                      setAgentRoleMCP(mcp.id, (prev) => ({
                        ...prev,
                        headers:
                          defaultRole?.mcps?.find(($) => $.id === mcp.id)
                            ?.headers ?? {},
                      }))
                    }
                    variant="inline"
                  />
                </h4>
                {Object.entries(mcp.headers).map(([headerKey, headerValue]) => (
                  <div className="flex items-end gap-3" key={headerKey}>
                    <Field>
                      <FieldLabel
                        htmlFor={`${mcp.id}-${headerInputIdPrefix}-key-${headerKey}`}
                      >
                        {t("labelHeaderName")}
                      </FieldLabel>
                      <Input
                        className="bg-background"
                        id={`${mcp.id}-${headerInputIdPrefix}-key-${headerKey}`}
                        onBlur={() => {
                          if (currentHTTPHeaderKey === headerKey) {
                            const headers = { ...mcp.headers };

                            delete headers[currentHTTPHeaderKey];
                            headers[currentHTTPHeaderKeyValue] =
                              mcp.headers[currentHTTPHeaderKey] ?? "";

                            setAgentRoleMCP(mcp.id, (prev) => ({
                              ...prev,
                              headers,
                            }));
                            setCurrentHTTPHeaderKey(undefined);
                          }
                        }}
                        onChange={({ currentTarget: { value } }) =>
                          setCurrentHTTPHeaderKeyValue(value)
                        }
                        onFocus={() => {
                          setCurrentHTTPHeaderKey(headerKey);
                          setCurrentHTTPHeaderKeyValue(headerKey);
                        }}
                        value={
                          currentHTTPHeaderKey === headerKey
                            ? currentHTTPHeaderKeyValue
                            : headerKey
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel
                        htmlFor={`${mcp.id}-${headerInputIdPrefix}-value-${headerKey}`}
                      >
                        {t("labelHeaderValue")}
                      </FieldLabel>
                      <Input
                        className="bg-background"
                        id={`${mcp.id}-${headerInputIdPrefix}-value-${headerKey}`}
                        onChange={({ currentTarget: { value } }) =>
                          setAgentRoleMCP(mcp.id, (prev) => ({
                            ...prev,
                            headers: {
                              ...mcp.headers,
                              [headerKey]: value,
                            },
                          }))
                        }
                        value={headerValue}
                      />
                    </Field>
                    <Button
                      onClick={() => {
                        const headers = { ...mcp.headers };
                        delete headers[headerKey];
                        setAgentRoleMCP(mcp.id, (prev) => ({
                          ...prev,
                          headers,
                        }));
                      }}
                      size="icon"
                      variant="destructive"
                    >
                      <X />
                    </Button>
                  </div>
                ))}
              </div>
            ) : undefined}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                aria-expanded={oauthExpanded[mcp.id] ?? !!mcp.oauthConnectionId}
                aria-controls={`${oauthPanelId}-${mcp.id}`}
                onClick={() =>
                  setOAuthExpanded((prev) => ({
                    ...prev,
                    [mcp.id]: !(prev[mcp.id] ?? !!mcp.oauthConnectionId),
                  }))
                }
              >
                <KeyRound data-icon="inline-start" />
                {t("labelOAuthApp")}
              </Button>

              <Button
                disabled={typeof mcp.headers[""] === "string"}
                onClick={() =>
                  setAgentRoleMCP(mcp.id, (prev) => ({
                    ...prev,
                    headers: { ...mcp.headers, "": "" },
                  }))
                }
                variant="outline"
              >
                {t("labelAddHeader")}
              </Button>

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
                    <AlertDialogTitle>{t("labelDeleteMCP")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("confirmDeleteDescription", { name: mcp.name })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("labelCancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        setAgentRole(roleId, (role) => ({
                          ...role,
                          mcps: role.mcps?.filter(($) => $.id !== mcp.id),
                        }));
                      }}
                      variant="destructive"
                    >
                      {t("labelDeleteMCP")}
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
            mcps: [
              ...(role.mcps ?? []),
              {
                headers: {},
                id: crypto.randomUUID(),
                type: "http",
                url: "",
              },
            ],
          }));
        }}
        size="sm"
      >
        {t("labelAddMCP")}
      </Button>
    </ContainerMain>
  );
}
