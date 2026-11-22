"use client";

import { EditorHeaderTitle } from "../../../../../_components/EditorHeaderTitle";
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
  CirclePlus,
  CircleX,
  Ellipsis,
  FolderOpen,
  Settings2,
  XCircle,
  Zap,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@schornio/aibox-package-ui/components/dropdown-menu";
import {
  HeaderMain,
  HeaderMainAsideContent,
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
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import { DocumentRepositoryEditorDiscardAllChanges } from "./DocumentRepositoryEditorDiscardAllChanges";
import { DocumentRepositoryEditorFeatures } from "./DocumentRepositoryEditorFeatures";
import { DocumentRepositoryEditorOverview } from "./DocumentRepositoryEditorOverview";
import { DocumentRepositoryEditorSettings } from "./DocumentRepositoryEditorSettings";
import {
  EditorActions,
  type EditorAction,
} from "../../../../../_components/EditorActions";
import type { Theme } from "../../../../../_models/systemConfigTheme";
import type { Transcriber_new } from "@schornio/aibox-package-database/transcriber/_types";
import type { ValidationErrors } from "next-safe-action";
import type { WorkspaceClaims } from "../../../../../_models/getWorkspaceClaims";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { composite } from "@schornio/aibox-package-utils/composite";
import { createDocumentRepository } from "../../_actions/createDocumentRepository";
import { deleteDocumentRepository } from "../../_actions/deleteDocumentRepository";
import type { documentRepositorySchema } from "@schornio/aibox-package-database/documentRepositories/_schema";
import { logError } from "@schornio/aibox-package-ui/components/error-log";
import { updateDocumentRepository } from "../../_actions/updateDocumentRepository";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useT } from "next-i18next/client";

type DocumentRepositoryEditorRelations = {
  models: AIModel[];
  theme: Theme;
  transcribers: Transcriber_new[];
  workspaces: WorkspaceClaims["claims"];
};

const documentRepositoryEditorContext = createContext<
  | {
      defaultDocumentRepository?: Partial<DocumentRepository>;
      hasValidationError: (...path: (string | number)[]) => boolean;
      relations: DocumentRepositoryEditorRelations;
      setDocumentRepository: Dispatch<
        SetStateAction<Partial<DocumentRepository> | undefined>
      >;
      documentRepository?: Partial<DocumentRepository>;
      validationErrors?: ValidationErrors<typeof documentRepositorySchema>;
    }
  | undefined
>(undefined);

export function useDocumentRepositoryEditor() {
  const context = useContext(documentRepositoryEditorContext);

  if (!context) {
    const error = new Error(
      "useDocumentRepositoryEditor() called outside provider",
    );
    logError("DocumentRepositoryEditor", error);
    throw error;
  }

  return context;
}

export function DocumentRepositoryEditor({
  mode,
  relations,
  documentRepository: defaultDocumentRepository,
}: {
  mode: "create" | "update";
  relations: DocumentRepositoryEditorRelations;
  documentRepository?: Partial<DocumentRepository>;
}) {
  const [documentRepository, setDocumentRepository] = useState(
    defaultDocumentRepository,
  );
  const { t } = useT("documentRepository", {
    keyPrefix: "_components.DocumentRepositoryEditor",
  });

  // <AlertDialogTrigger /> gets selected on drop-down. Therefore this workaround
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const {
    execute,
    isPending,
    result: { validationErrors: defaultValidationErrors },
  } = useAction(
    mode === "create" ? createDocumentRepository : updateDocumentRepository,
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
  } = useAction(createDocumentRepository, createCloneActionUtils);

  const {
    actionUtils: deleteActionUtils,
    hasErrored: deleteHasErrored,
    hasSucceeded: deleteHasSucceeded,
  } = useDecayActionState();
  const { execute: deleteExecute, isPending: deleteIsPending } = useAction(
    deleteDocumentRepository,
    deleteActionUtils,
  );

  const validationErrors =
    defaultValidationErrors ?? createCloneValidationErrors;

  const hasValidationError = (...path: (string | number)[]) => {
    let current = validationErrors?.documentRepository as Record<
      string,
      unknown
    >;

    for (const element of path) {
      if (current && typeof current === "object" && element in current) {
        current = current[element] as Record<string, unknown>;
      } else {
        return false;
      }
    }

    return true;
  };

  const documentRepositoryChanged =
    composite(defaultDocumentRepository) !== composite(documentRepository);

  const input = {
    documentRepository: (documentRepository
      ? { ...documentRepository, type: "database-v2" }
      : {}) as DocumentRepository,
  };
  const saveProps = {
    disabled: mode === "update" && !documentRepositoryChanged,
    hasErrored,
    hasSucceeded,
    isPending,
    onClick: () => execute(input),
  };
  const actions: EditorAction[] = [
    {
      ...saveProps,
      label: t(
        mode === "create"
          ? "labelCreateDocumentRepository"
          : "labelSaveDocumentRepository",
      ),
      icon: mode === "create" ? CirclePlus : ArrowDownToLine,
    },
  ];
  if (mode === "update") {
    actions.push(
      {
        label: t("labelCloneDocumentRepository"),
        icon: CirclePlus,
        disabled: !documentRepositoryChanged,
        hasErrored: createCloneHasErrored,
        hasSucceeded: createCloneHasSucceeded,
        isPending: createCloneIsPending,
        onClick: () => createCloneExecute(input),
      },
      {
        label: t("labelDeleteDocumentRepository"),
        icon: CircleX,
        destructive: true,
        onClick: () => setDeleteDialogOpen(true),
      },
    );
  }

  useEffect(() => {
    const handler = (event: Event) => {
      if (documentRepositoryChanged) {
        event.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handler);

    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [documentRepositoryChanged]);

  return (
    <documentRepositoryEditorContext.Provider
      value={{
        defaultDocumentRepository,
        documentRepository,
        hasValidationError,
        relations,
        setDocumentRepository,
        validationErrors: validationErrors?.documentRepository,
      }}
    >
      <HeaderMain appColor={documentRepository?.color}>
        <EditorHeaderTitle
          icon={<FolderOpen />}
          title={
            mode === "create"
              ? t("labelNewDocumentRepository")
              : t("labelDocumentRepository")
          }
          name={documentRepository?.name}
        >
          {mode === "create" ? <CirclePlus /> : undefined}
          {mode === "update" ? (
            <DocumentRepositoryEditorDiscardAllChanges />
          ) : undefined}
        </EditorHeaderTitle>
        <HeaderMainAsideContent>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button size="icon-sm" variant="ghost" />}
            >
              <Ellipsis />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-auto">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  {t("labelDocumentRepositoryDropdown")}
                </DropdownMenuLabel>
                <EditorActions display="menu" actions={actions} />
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
              {t("confirmDeleteDescription", {
                name: documentRepository?.name,
              })}
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
                deleteExecute({
                  documentRepositoryId: documentRepository?.id ?? "",
                })
              }
              variant="destructive"
            >
              {t("labelDeleteDocumentRepository")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TabsMainList stickyTop>
        <TabsMainTrigger view="default">
          <FolderOpen /> {t("tabOverview")}
        </TabsMainTrigger>
        <TabsMainTrigger view="features">
          <Zap /> {t("tabFeatures")}
        </TabsMainTrigger>
        <TabsMainTrigger
          className={cn({
            "text-destructive": Boolean(
              validationErrors?.documentRepository?.workspaceId,
            ),
          })}
          view="settings"
        >
          <Settings2 /> {t("tabSettings")}
        </TabsMainTrigger>
        <ButtonAction {...saveProps} size="sm">
          {mode === "create" ? <CirclePlus /> : <ArrowDownToLine />}
          {t(mode === "create" ? "btnCreate" : "btnSave")}
        </ButtonAction>
      </TabsMainList>

      <TabsMainContent view="default">
        <DocumentRepositoryEditorOverview mode={mode} />
        <EditorActions display="overview" actions={actions} />
      </TabsMainContent>
      <TabsMainContent view="features">
        <DocumentRepositoryEditorFeatures />
      </TabsMainContent>
      <TabsMainContent view="settings">
        <DocumentRepositoryEditorSettings mode={mode} />
      </TabsMainContent>
    </documentRepositoryEditorContext.Provider>
  );
}
