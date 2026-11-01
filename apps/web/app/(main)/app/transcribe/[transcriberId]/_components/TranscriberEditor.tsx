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
} from "@schornio/aibox-package-ui/components/alert-dialog";
import {
  ArrowDownToLine,
  AudioLines,
  CirclePlus,
  CircleX,
  Ellipsis,
  FileHeadphone,
  Settings2,
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
} from "../../../../../_components/TabsMain";
import { createContext, useContext, useEffect, useState } from "react";
import type { AIModel } from "@schornio/aibox-package-database/aiModel/_types";
import { AlertDialogMediaDestructive } from "@schornio/aibox-package-ui/components/alert-dialog-media-destructive";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { DropdownMenuItemAction } from "@schornio/aibox-package-ui/components/dropdown-menu-item-action";
import type { SettingFavorites } from "../../../../../_models/currentUserConfigFavorites";
import type { Theme } from "../../../../../_models/systemConfigTheme";
import { TranscriberEditorDiscardAllChanges } from "./TranscriberEditorDiscardAllChanges";
import { TranscriberEditorOverview } from "./TranscriberEditorOverview";
import { TranscriberEditorPrompt } from "./TranscriberEditorPrompt";
import { TranscriberEditorSettings } from "./TranscriberEditorSettings";
import type { Transcriber_new } from "@schornio/aibox-package-database/transcriber/_types";
import type { ValidationErrors } from "next-safe-action";
import type { WorkspaceClaims } from "../../../../../_models/getWorkspaceClaims";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { composite } from "@schornio/aibox-package-utils/composite";
import { createTranscriber } from "../../_actions/createTranscriber";
import { deleteTranscriber } from "../../_actions/deleteTranscriber";
import { logError } from "@schornio/aibox-package-ui/components/error-log";
import type { transcriberSchema } from "@schornio/aibox-package-database/transcriber/_schemas";
import { updateTranscriber } from "../../_actions/updateTranscriber";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useT } from "next-i18next/client";

type TranscriberEditorRelations = {
  models: AIModel[];
  theme: Theme;
  workspaces: WorkspaceClaims["claims"];
};

const transcriberEditorContext = createContext<
  | {
      defaultTranscriber?: Partial<Transcriber_new>;
      hasValidationError: (...path: (string | number)[]) => boolean;
      isPending: boolean;
      relations: TranscriberEditorRelations;
      setTranscriber: Dispatch<
        SetStateAction<Partial<Transcriber_new> | undefined>
      >;
      transcriber?: Partial<Transcriber_new>;
      validationErrors?: ValidationErrors<typeof transcriberSchema>;
    }
  | undefined
>(undefined);

export function useTranscriberEditor() {
  const context = useContext(transcriberEditorContext);

  if (!context) {
    const error = new Error("useTranscriberEditor() called outside provider");
    logError("TranscriberEditor", error);
    throw error;
  }

  return context;
}

export function TranscriberEditor({
  favorites,
  mode,
  relations,
  transcriber: defaultTranscriber,
}: {
  favorites?: SettingFavorites;
  mode: "create" | "update";
  relations: TranscriberEditorRelations;
  transcriber?: Partial<Transcriber_new>;
}) {
  const [transcriber, setTranscriber] = useState(defaultTranscriber);
  const { t } = useT("transcriber", {
    keyPrefix: "_components.TranscriberEditor",
  });

  // <AlertDialogTrigger /> gets selected on drop-down. Therefore this workaround
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const {
    execute,
    isPending,
    result: { validationErrors: defaultValidationErrors },
  } = useAction(
    mode === "create" ? createTranscriber : updateTranscriber,
    actionUtils,
  );

  const {
    actionUtils: createCloneActionUtils,
    hasErrored: createCloneHasErrored,
    hasSucceeded: createCloneHasSucceeded,
  } = useDecayActionState();
  const {
    execute: createCloneExecute,
    isPending: createCloneIsPending,
    result: { validationErrors: createCloneValidationErrors },
  } = useAction(createTranscriber, createCloneActionUtils);

  const {
    actionUtils: deleteActionUtils,
    hasErrored: deleteHasErrored,
    hasSucceeded: deleteHasSucceeded,
  } = useDecayActionState();
  const { execute: deleteExecute, isPending: deleteIsPending } = useAction(
    deleteTranscriber,
    deleteActionUtils,
  );

  const validationErrors =
    defaultValidationErrors ?? createCloneValidationErrors;

  const hasValidationError = (...path: (string | number)[]) => {
    let current = validationErrors?.transcriber as Record<string, unknown>;

    for (const element of path) {
      if (current && typeof current === "object" && element in current) {
        current = current[element] as Record<string, unknown>;
      } else {
        return false;
      }
    }

    return true;
  };

  const transcriberChanged =
    composite(defaultTranscriber) !== composite(transcriber);

  useEffect(() => {
    const handler = (event: Event) => {
      if (transcriberChanged) {
        event.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handler);

    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [transcriberChanged]);

  return (
    <transcriberEditorContext.Provider
      value={{
        defaultTranscriber,
        hasValidationError,
        isPending: isPending || createCloneIsPending || deleteIsPending,
        relations,
        setTranscriber,
        transcriber,
        validationErrors: validationErrors?.transcriber,
      }}
    >
      <HeaderMain appColor={transcriber?.color}>
        <HeaderMainContent>
          <AudioLines />
          <div className="flex flex-col text-center">
            {mode === "create" ? (
              <span className="text-nowrap">{t("labelNewTranscriber")}</span>
            ) : undefined}
            {mode === "update" ? (
              <span className="text-nowrap">{t("labelTranscriber")}</span>
            ) : undefined}
            <span className="text-xs text-nowrap">{transcriber?.name}</span>
          </div>
          {mode === "create" ? <CirclePlus /> : undefined}
          {mode === "update" ? (
            <TranscriberEditorDiscardAllChanges />
          ) : undefined}
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
                <DropdownMenuLabel>{t("labelTranscriber")}</DropdownMenuLabel>
                <DropdownMenuItemAction
                  disabled={
                    mode === "update" &&
                    composite(defaultTranscriber) === composite(transcriber)
                  }
                  hasErrored={hasErrored}
                  hasSucceeded={hasSucceeded}
                  isPending={isPending}
                  onClick={() =>
                    execute({
                      transcriber: (transcriber ?? {}) as Transcriber_new,
                    })
                  }
                >
                  {mode === "create" ? (
                    <>
                      <CirclePlus /> {t("labelCreateTranscriber")}
                    </>
                  ) : undefined}
                  {mode === "update" ? (
                    <>
                      <ArrowDownToLine /> {t("labelSaveTranscriber")}
                    </>
                  ) : undefined}
                </DropdownMenuItemAction>
                {mode === "update" ? (
                  <>
                    <DropdownMenuItemAction
                      disabled={
                        mode === "update" &&
                        composite(defaultTranscriber) === composite(transcriber)
                      }
                      hasErrored={createCloneHasErrored}
                      hasSucceeded={createCloneHasSucceeded}
                      isPending={createCloneIsPending}
                      onClick={() =>
                        createCloneExecute({
                          transcriber: {
                            ...transcriber,
                            id: crypto.randomUUID(),
                            identifier: crypto.randomUUID(),
                          } as Transcriber_new,
                        })
                      }
                    >
                      <CirclePlus /> {t("labelCloneTranscriber")}
                    </DropdownMenuItemAction>
                    <DropdownMenuSeparator />
                    <DropdownMenuItemAction
                      onClick={() => setDeleteDialogOpen(true)}
                      variant="destructive"
                    >
                      <CircleX /> {t("labelDeleteTranscriber")}
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
              {t("confirmDeleteDescription", { name: transcriber?.name })}
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
              onClick={() =>
                deleteExecute({ transcriberId: transcriber?.id ?? "" })
              }
              variant="destructive"
            >
              {t("labelDeleteTranscriber")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TabsMainList stickyTop>
        <TabsMainTrigger view="default">
          <AudioLines /> {t("tabOverview")}
        </TabsMainTrigger>
        <TabsMainTrigger
          view="prompt"
          className={cn({
            "text-destructive": Boolean(
              validationErrors?.transcriber?.modelIdentifier,
            ),
          })}
        >
          <FileHeadphone /> {t("tabPrompt")}
        </TabsMainTrigger>
        <TabsMainTrigger
          className={cn({
            "text-destructive": Boolean(
              validationErrors?.transcriber?.workspaceId ||
              validationErrors?.transcriber?.retryLevel,
            ),
          })}
          view="settings"
        >
          <Settings2 /> {t("tabSettings")}
        </TabsMainTrigger>
        <ButtonAction
          disabled={
            mode === "update" &&
            composite(defaultTranscriber) === composite(transcriber)
          }
          hasErrored={hasErrored}
          hasSucceeded={hasSucceeded}
          isPending={isPending}
          onClick={() =>
            execute({ transcriber: (transcriber ?? {}) as Transcriber_new })
          }
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
        <TranscriberEditorOverview favorites={favorites} mode={mode} />
      </TabsMainContent>
      <TabsMainContent view="prompt">
        <TranscriberEditorPrompt />
      </TabsMainContent>
      <TabsMainContent view="settings">
        <TranscriberEditorSettings />
      </TabsMainContent>
    </transcriberEditorContext.Provider>
  );
}
