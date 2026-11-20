"use client";

import { useId, useState } from "react";
import {
  AudioLines,
  BotMessageSquare,
  FolderOpen,
  Plus,
  Search,
  X,
  ArrowLeftRight,
} from "lucide-react";
import { useT } from "next-i18next/client";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import type { Transcriber_new } from "@schornio/aibox-package-database/transcriber/_types";
import type { AIModel } from "@schornio/aibox-package-database/aiModel/_types";
import type { WorkspaceClaim } from "../_models/getWorkspaceClaims";
import { SelectableResourceCard } from "./SelectableResourceCard";
import { AgentCard } from "../(main)/agent/_components/AgentCard";
import { DocumentRepositoryCard } from "../(main)/app/documents/_components/DocumentRepositoryCard";
import { TranscriberCard } from "../(main)/app/transcribe/_components/TranscriberCard";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@schornio/aibox-package-ui/components/empty";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@schornio/aibox-package-ui/components/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@schornio/aibox-package-ui/components/input-group";
import {
  Field,
  FieldLabel,
  FieldDescription,
} from "@schornio/aibox-package-ui/components/field";
import { useFilter } from "@/lib/useFilter";

type ResourceProps =
  | { type: "agent"; resources: Agent[] }
  | { type: "documentRepository"; resources: DocumentRepository[] }
  | { type: "transcriber"; resources: Transcriber_new[] };
export type ResourceSlotProps = ResourceProps & {
  value?: string;
  onChange: (id: string | undefined) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  invalid?: boolean;
  models?: AIModel[];
  repositories?: DocumentRepository[];
  transcribers?: Transcriber_new[];
  workspaces?: WorkspaceClaim[];
};

/** Selection composes the existing app cards; it never starts an activity or
 * navigates to a resource. Callers supply only resources the user may select. */
export function ResourceSlot(props: ResourceSlotProps) {
  const { t } = useT("common", { keyPrefix: "_components.ResourceSlot" });
  const id = useId();
  const [open, setOpen] = useState(false);
  const { filter, setFilter, filteredData } = useFilter<{
    id: string;
    name: string;
    description?: string;
  }>(props.resources, { keys: ["name", "description"] });
  const selected = props.resources.find((item) => item.id === props.value);
  const Icon = {
    agent: BotMessageSquare,
    documentRepository: FolderOpen,
    transcriber: AudioLines,
  }[props.type];
  const title = props.label ?? t(`types.${props.type}`);
  function card(resourceId: string) {
    switch (props.type) {
      case "agent": {
        const agent = props.resources.find((item) => item.id === resourceId)!;
        return (
          <AgentCard
            preview
            agent={agent}
            documentRepositoryMap={
              new Map(
                (props.repositories ?? []).map((repo) => [
                  repo.identifier,
                  repo,
                ]),
              )
            }
            model={props.models?.find(
              (model) => model.identifier === agent.modelIdentifier,
            )}
            workspace={props.workspaces?.find(
              (workspace) => workspace.id === agent.workspaceId,
            )}
          />
        );
      }
      case "documentRepository": {
        const repo = props.resources.find((item) => item.id === resourceId)!;
        return (
          <DocumentRepositoryCard
            preview
            documentRepository={repo}
            embeddingModel={props.models?.find(
              (model) =>
                model.identifier === repo.index?.embedding?.modelIdentifier,
            )}
            transcriber={props.transcribers?.find(
              (item) => item.identifier === repo.transcriberIdentifier,
            )}
            workspace={props.workspaces?.find(
              (workspace) => workspace.id === repo.workspaceId,
            )}
          />
        );
      }
      case "transcriber": {
        const transcriber = props.resources.find(
          (item) => item.id === resourceId,
        )!;
        return (
          <TranscriberCard
            preview
            transcriber={transcriber}
            model={props.models?.find(
              (model) => model.identifier === transcriber.modelIdentifier,
            )}
            workspace={props.workspaces?.find(
              (workspace) => workspace.id === transcriber.workspaceId,
            )}
          />
        );
      }
    }
  }
  const show = () => {
    setFilter("");
    setOpen(true);
  };
  return (
    <Field data-invalid={props.invalid} data-disabled={props.disabled}>
      <FieldLabel id={`${id}-label`}>{title}</FieldLabel>
      {props.description && (
        <FieldDescription>{props.description}</FieldDescription>
      )}
      <div className="flex w-full max-w-80 flex-col gap-2 [&>div]:max-w-full">
        {selected ? (
          <>
            {card(selected.id)}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={props.disabled}
                className="flex-1"
                aria-label={t("labelChangeResource", { resource: title })}
                onClick={show}
              >
                <ArrowLeftRight />
                {t("labelChange")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={props.disabled}
                aria-label={t("labelClearResource", { resource: title })}
                onClick={() => props.onChange(undefined)}
              >
                <X />
              </Button>
            </div>
          </>
        ) : (
          <ContainerStyled
            variant="card"
            interactive
            className="flex aspect-video w-full items-center justify-center border-dashed"
            render={
              <button
                type="button"
                disabled={props.disabled}
                aria-invalid={props.invalid}
                aria-labelledby={`${id}-label ${id}-empty`}
                onClick={show}
              />
            }
          >
            <Empty className="p-3">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Icon />
                </EmptyMedia>
                <EmptyTitle id={`${id}-empty`}>
                  {t("labelChooseResource", { resource: title })}
                </EmptyTitle>
                <EmptyDescription>
                  {t(
                    props.value ? "descriptionUnavailable" : "descriptionEmpty",
                  )}
                </EmptyDescription>
              </EmptyHeader>
              <Plus aria-hidden="true" />
            </Empty>
          </ContainerStyled>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {t("labelChooseResource", { resource: title })}
            </DialogTitle>
            <DialogDescription>{t("descriptionDialog")}</DialogDescription>
          </DialogHeader>
          <InputGroup>
            <InputGroupInput
              aria-label={t("labelSearch")}
              placeholder={t("labelSearch")}
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>
          <div className="grid max-h-[60vh] justify-items-center gap-4 overflow-y-auto p-1 sm:grid-cols-2">
            {filteredData.map((resource) => (
              <SelectableResourceCard
                key={resource.id}
                name={resource.name}
                selected={resource.id === props.value}
                disabled={props.disabled}
                onSelect={() => {
                  props.onChange(resource.id);
                  setOpen(false);
                }}
              >
                {card(resource.id)}
              </SelectableResourceCard>
            ))}
            {!filteredData.length && (
              <Empty className="sm:col-span-2">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Icon />
                  </EmptyMedia>
                  <EmptyTitle>{t("labelNoResults")}</EmptyTitle>
                  <EmptyDescription>
                    {t("descriptionNoResults")}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Field>
  );
}
