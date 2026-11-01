"use client";
import type { ConnectionMetadata } from "@schornio/aibox-package-database/connections/_types";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@schornio/aibox-package-ui/components/alert-dialog";
import {
  ArrowDownToLine,
  BotMessageSquare,
  CirclePlus,
  CircleX,
  Ellipsis,
  Lightbulb,
  Settings2,
  Shapes,
  XCircle,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@schornio/aibox-package-ui/components/dropdown-menu";
import {
  HeaderMain,
  HeaderMainAsideContent,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import {
  TabsMainContent,
  TabsMainList,
  TabsMainTrigger,
} from "../../../_components/TabsMain";
import { createContext, useContext, useEffect, useState } from "react";
import type { AIModel } from "@schornio/aibox-package-database/aiModel/_types";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import { AgentEditorDiscardAllChanges } from "./AgentEditorDiscardAllChanges";
import { AgentEditorDocs } from "./AgentEditorDocs";
import { AgentEditorOverview } from "./AgentEditorOverview";
import { AgentEditorRoles } from "./AgentEditorRoles";
import { AgentEditorSettings } from "./AgentEditorSettings";
import { AlertDialogMediaDestructive } from "@schornio/aibox-package-ui/components/alert-dialog-media-destructive";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import { DropdownMenuItemAction } from "@schornio/aibox-package-ui/components/dropdown-menu-item-action";
import type { SettingFavorites } from "../../../_models/currentUserConfigFavorites";
import type { Theme } from "../../../_models/systemConfigTheme";
import type { Transcriber_new } from "@schornio/aibox-package-database/transcriber/_types";
import type { ValidationErrors } from "next-safe-action";
import type { WorkspaceClaims } from "../../../_models/getWorkspaceClaims";
import type { agentSchema } from "@schornio/aibox-package-database/agent/_schemas";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { composite } from "@schornio/aibox-package-utils/composite";
import { createAgent } from "../_actions/createAgent";
import { deleteAgent } from "../_actions/deleteAgent";
import { logError } from "@schornio/aibox-package-ui/components/error-log";
import { omitNullish } from "@schornio/aibox-package-utils/omitNullish";
import { updateAgent } from "../_actions/updateAgent";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useT } from "next-i18next/client";

type AgentEditorRelations = {
  connections: ConnectionMetadata[];
  documentRepositories: DocumentRepository[];
  models: AIModel[];
  theme: Theme;
  transcribers?: Transcriber_new[];
  workspaces: WorkspaceClaims["claims"];
};

const agentEditorContext = createContext<
  | {
      agent?: Partial<Agent>;
      defaultAgent?: Partial<Agent>;
      hasValidationError: (...path: (string | number)[]) => boolean;
      relations: AgentEditorRelations;
      setAgent: Dispatch<SetStateAction<Partial<Agent> | undefined>>;
      validationErrors?: ValidationErrors<typeof agentSchema>;
    }
  | undefined
>(undefined);

export function useAgentEditor() {
  const context = useContext(agentEditorContext);

  if (!context) {
    const error = new Error("useAgentEditor() called outside provider");
    logError("AgentEditor", error);
    throw error;
  }

  const setAgentRole = (
    roleId: string,
    action?: SetStateAction<Agent["roles"][number]>,
  ) => {
    context.setAgent((prev) => {
      return {
        ...prev,
        roles: prev?.roles
          ?.map((role) => {
            if (role.id === roleId) {
              if (typeof action === "function") {
                return action(role);
              } else {
                return action;
              }
            }

            return role;
          })
          .filter(omitNullish),
      };
    });
  };

  return { ...context, setAgentRole };
}

export function AgentEditor({
  agent: defaultAgent,
  mode,
  favorites,
  relations,
}: {
  agent?: Partial<Agent>;
  favorites?: SettingFavorites;
  mode: "create" | "update";
  relations: AgentEditorRelations;
}) {
  const [agent, setAgent] = useState(defaultAgent);
  const { t } = useT("agent", { keyPrefix: "_components.AgentEditor" });

  // <AlertDialogTrigger /> gets selected on drop-down. Therefore this workaround
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const {
    execute,
    isPending,
    result: { validationErrors: defaultValidationErrors },
  } = useAction(mode === "create" ? createAgent : updateAgent, actionUtils);

  const {
    actionUtils: createCloneActionUtils,
    hasErrored: createCloneHasErrored,
    hasSucceeded: createCloneHasSucceeded,
  } = useDecayActionState();
  const {
    execute: createCloneExecute,
    isPending: createCloneIsPending,
    result: { validationErrors: createCloneValidationErrors },
  } = useAction(createAgent, createCloneActionUtils);

  const {
    actionUtils: deleteActionUtils,
    hasErrored: deleteHasErrored,
    hasSucceeded: deleteHasSucceeded,
  } = useDecayActionState();
  const { execute: deleteExecute, isPending: deleteIsPending } = useAction(
    deleteAgent,
    deleteActionUtils,
  );

  const validationErrors =
    defaultValidationErrors ?? createCloneValidationErrors;

  const hasValidationError = (...path: (string | number)[]) => {
    let current = validationErrors?.agent as Record<string, unknown>;

    for (const element of path) {
      if (current && typeof current === "object" && element in current) {
        current = current[element] as Record<string, unknown>;
      } else {
        return false;
      }
    }

    return true;
  };

  const agentChanged = composite(defaultAgent) !== composite(agent);

  useEffect(() => {
    const handler = (event: Event) => {
      if (agentChanged) {
        event.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handler);

    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [agentChanged]);

  return (
    <agentEditorContext.Provider
      value={{
        agent,
        defaultAgent,
        hasValidationError,
        relations,
        setAgent,
        validationErrors: validationErrors?.agent,
      }}
    >
      <HeaderMain appColor={agent?.color}>
        <HeaderMainContent>
          <BotMessageSquare />
          <div className="flex flex-col text-center">
            {mode === "create" ? (
              <span className="text-nowrap">{t("labelNewAgent")}</span>
            ) : undefined}
            {mode === "update" ? (
              <span className="text-nowrap">{t("labelAgent")}</span>
            ) : undefined}
            <span className="text-xs text-nowrap">{agent?.name}</span>
          </div>
          {mode === "create" ? <CirclePlus /> : undefined}
          {mode === "update" ? <AgentEditorDiscardAllChanges /> : undefined}
        </HeaderMainContent>
        <HeaderMainAsideContent>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button size="icon-sm" variant="ghost" />}
            >
              <Ellipsis />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-auto">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("labelAgent")}</DropdownMenuLabel>
                <DropdownMenuItemAction
                  disabled={
                    mode === "update" &&
                    composite(defaultAgent) === composite(agent)
                  }
                  hasErrored={hasErrored}
                  hasSucceeded={hasSucceeded}
                  isPending={isPending}
                  onClick={() => execute({ agent: (agent ?? {}) as Agent })}
                >
                  {mode === "create" ? (
                    <>
                      <CirclePlus /> {t("labelCreateAgent")}
                    </>
                  ) : undefined}
                  {mode === "update" ? (
                    <>
                      <ArrowDownToLine /> {t("labelSaveAgent")}
                    </>
                  ) : undefined}
                </DropdownMenuItemAction>
                {mode === "update" ? (
                  <>
                    <DropdownMenuItemAction
                      disabled={
                        mode === "update" &&
                        composite(defaultAgent) === composite(agent)
                      }
                      hasErrored={createCloneHasErrored}
                      hasSucceeded={createCloneHasSucceeded}
                      isPending={createCloneIsPending}
                      onClick={() =>
                        createCloneExecute({ agent: (agent ?? {}) as Agent })
                      }
                    >
                      <CirclePlus /> {t("labelCloneAgent")}
                    </DropdownMenuItemAction>
                    <DropdownMenuSeparator />
                    <DropdownMenuItemAction
                      onClick={() => setDeleteDialogOpen(true)}
                      variant="destructive"
                    >
                      <CircleX /> {t("labelDeleteAgent")}
                    </DropdownMenuItemAction>
                  </>
                ) : undefined}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </HeaderMainAsideContent>
      </HeaderMain>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMediaDestructive>
              <XCircle />
            </AlertDialogMediaDestructive>
            <AlertDialogTitle>{t("confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDeleteDescription", { name: agent?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("labelCancel")}</AlertDialogCancel>
            <AlertDialogAction
              render={
                <ButtonAction
                  hasErrored={deleteHasErrored}
                  hasSucceeded={deleteHasSucceeded}
                  isPending={deleteIsPending}
                />
              }
              onClick={() => deleteExecute({ agentId: agent?.id ?? "" })}
              variant="destructive"
            >
              {t("labelDeleteAgent")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TabsMainList stickyTop>
        <TabsMainTrigger view="default">
          <BotMessageSquare /> {t("tabOverview")}
        </TabsMainTrigger>
        <TabsMainTrigger
          className={cn({
            "text-destructive": Boolean(validationErrors?.agent?.roles),
          })}
          view="roles"
        >
          <Shapes /> {t("tabRoles")}
        </TabsMainTrigger>
        <TabsMainTrigger view="docs">
          <Lightbulb /> {t("tabDocs")}
        </TabsMainTrigger>
        <TabsMainTrigger
          className={cn({
            "text-destructive":
              Boolean(validationErrors?.agent?.modelIdentifier) ||
              Boolean(validationErrors?.agent?.workspaceId),
          })}
          view="settings"
        >
          <Settings2 /> {t("tabSettings")}
        </TabsMainTrigger>
        <ButtonAction
          disabled={
            mode === "update" && composite(defaultAgent) === composite(agent)
          }
          hasErrored={hasErrored}
          hasSucceeded={hasSucceeded}
          isPending={isPending}
          onClick={() => execute({ agent: (agent ?? {}) as Agent })}
          size="sm"
        >
          {mode === "create" ? (
            <>
              <CirclePlus /> {t("btnCreate")}
            </>
          ) : undefined}
          {mode === "update" ? (
            <>
              <ArrowDownToLine /> {t("btnSave")}
            </>
          ) : undefined}
        </ButtonAction>
      </TabsMainList>

      <TabsMainContent view="default">
        <AgentEditorOverview favorites={favorites} mode={mode} />
      </TabsMainContent>
      <TabsMainContent view="roles">
        <AgentEditorRoles />
      </TabsMainContent>
      <TabsMainContent view="docs">
        <AgentEditorDocs />
      </TabsMainContent>
      <TabsMainContent view="settings">
        <AgentEditorSettings />
      </TabsMainContent>
    </agentEditorContext.Provider>
  );
}
