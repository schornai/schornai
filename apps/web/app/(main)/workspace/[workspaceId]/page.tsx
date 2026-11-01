import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
} from "@schornio/aibox-package-ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@schornio/aibox-package-ui/components/empty";
import {
  HeaderMain,
  HeaderMainAsideContent,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { AgentCard } from "../../agent/_components/AgentCard";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { DocumentRepositoryCard } from "../../app/documents/_components/DocumentRepositoryCard";
import { Library } from "lucide-react";
import { MarkdownProse } from "@schornio/aibox-package-ui/components/markdown-prose";
import { TranscriberCard } from "../../app/transcribe/_components/TranscriberCard";
import type { Transcriber_new } from "@schornio/aibox-package-database/transcriber/_types";
import { UserRoleIcon } from "../../../_components/UserRoleIcon";
import { UserRoleText } from "../../../_components/UserRoleText";
import { WorkspaceIconGroupActions } from "../_components/WorkspaceIconGroupActions";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getAIModels } from "../../../_models/getAIModels";
import { getAgents } from "@schornio/aibox-package-database/agent/getAgents";
import { getCurrentUserConfigFavorites } from "../../../_models/currentUserConfigFavorites";
import { getDocumentRepositories } from "../../../_models/getDocumentRepositories";
import { getT } from "next-i18next/server";
import { getTranscribers } from "@schornio/aibox-package-database/transcriber/getTranscribers";
import { getWorkspaceClaims } from "../../../_models/getWorkspaceClaims";
import { hasPermission } from "@/lib/hasPermission";
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const [{ workspaceId }, { claims }] = await Promise.all([
    params,
    getWorkspaceClaims(),
  ]);
  const workspace = claims.find((item) => item.id === workspaceId);
  if (
    !workspace ||
    !hasPermission({ claim: workspace.claim, permission: "user" })
  ) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const [agents, documentRepositories, transcribers, models, favorites, { t }] =
    await Promise.all([
      getAgents({ supabase }),
      getDocumentRepositories(),
      getTranscribers({ supabase }),
      getAIModels(),
      getCurrentUserConfigFavorites(),
      getT("workspace", { keyPrefix: "page" }),
    ]);
  const workspaceAgents = agents.filter(
    (item) => item.workspaceId === workspaceId,
  );
  const workspaceRepositories = documentRepositories.filter(
    (item) => item.workspaceId === workspaceId,
  );
  const workspaceTranscribers = transcribers.filter(
    (item) => item.workspaceId === workspaceId,
  );
  const documentRepositoryMap = new Map(
    documentRepositories.map((item) => [item.id, item]),
  );
  const modelMap = new Map(models.map((model) => [model.identifier, model]));
  const transcriberMap = new Map([
    ...transcribers.map<[string, Transcriber_new]>((item) => [
      item.identifier,
      item,
    ]),
    ...transcribers.map<[string, Transcriber_new]>((item) => [item.id, item]),
  ]);
  const isEmpty =
    workspaceAgents.length === 0 &&
    workspaceRepositories.length === 0 &&
    workspaceTranscribers.length === 0;

  return (
    <>
      <HeaderMain>
        <HeaderMainContent>
          <Library /> {workspace.name}
        </HeaderMainContent>
        <HeaderMainAsideContent>
          <WorkspaceIconGroupActions
            favorites={favorites}
            workspace={workspace}
          />
        </HeaderMainAsideContent>
      </HeaderMain>
      <ContainerMain className="flex flex-col gap-6" size="narrow">
        {workspace.description ? (
          <MarkdownProse>{workspace.description}</MarkdownProse>
        ) : undefined}
        {workspace.documentation ? (
          <MarkdownProse>{workspace.documentation}</MarkdownProse>
        ) : undefined}
      </ContainerMain>
      <ContainerMain className="my-6 flex flex-wrap justify-center gap-3">
        {isEmpty ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Library />
              </EmptyMedia>
              <EmptyTitle>{t("labelEmpty")}</EmptyTitle>
              <EmptyDescription>{t("descriptionEmpty")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            {workspaceAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                documentRepositoryMap={documentRepositoryMap}
                favorites={favorites}
                model={modelMap.get(agent.modelIdentifier ?? "")}
                workspace={workspace}
              />
            ))}
            {workspaceRepositories.map((documentRepository) => (
              <DocumentRepositoryCard
                key={documentRepository.id}
                documentRepository={documentRepository}
                embeddingModel={modelMap.get(
                  documentRepository.index?.embedding?.modelIdentifier ?? "",
                )}
                favorites={favorites}
                transcriber={transcriberMap.get(
                  documentRepository.transcriberIdentifier ?? "",
                )}
                workspace={workspace}
              />
            ))}
            {workspaceTranscribers.map((transcriber) => (
              <TranscriberCard
                key={transcriber.id}
                transcriber={transcriber}
                favorites={favorites}
                model={modelMap.get(transcriber.modelIdentifier ?? "")}
                workspace={workspace}
              />
            ))}
          </>
        )}
      </ContainerMain>
      <ContainerMain className="mb-6" size="narrow">
        <Card size="sm">
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{t("labelYourRole")}</CardTitle>
            <CardAction className="flex items-center gap-2">
              <UserRoleIcon
                className="size-4 shrink-0"
                role={workspace.claim}
              />
              <UserRoleText role={workspace.claim} />
            </CardAction>
          </CardHeader>
        </Card>
      </ContainerMain>
    </>
  );
}
