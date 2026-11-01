import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@schornio/aibox-package-ui/components/empty";
import { Trans } from "react-i18next/TransWithoutContext";
import { getT } from "next-i18next/server";
import { AgentCard } from "../agent/_components/AgentCard";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { DocumentRepositoryCard } from "../app/documents/_components/DocumentRepositoryCard";
import { Fragment } from "react/jsx-runtime";
import Link from "next/link";
import { Star } from "lucide-react";
import { TranscriberCard } from "../app/transcribe/_components/TranscriberCard";
import type { Transcriber_new } from "@schornio/aibox-package-database/transcriber/_types";
import { WorkspaceCard } from "../workspace/_components/WorkspaceCard";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getAIModels } from "../../_models/getAIModels";
import { getCurrentUserConfigFavorites } from "../../_models/currentUserConfigFavorites";
import { getDocumentRepositories } from "../../_models/getDocumentRepositories";
import { getTranscribers } from "@schornio/aibox-package-database/transcriber/getTranscribers";
import { getWorkspaceClaims } from "../../_models/getWorkspaceClaims";
import { hasPermission } from "@/lib/hasPermission";

export default async function DashboardFavorites() {
  const supabase = await createSupabaseServerClient();

  const [
    favorites,
    documentRepositories,
    models,
    transcribers,
    { claims: workspaces },
    { t, i18n },
  ] = await Promise.all([
    getCurrentUserConfigFavorites(),
    getDocumentRepositories(),
    getAIModels(),
    getTranscribers({ supabase }),
    getWorkspaceClaims(),
    getT("common", { keyPrefix: "main._components.DashboardFavorites" }),
  ]);

  const agentMap = new Map(favorites.agents?.map((agent) => [agent.id, agent]));
  const transcriberMap = new Map([
    ...transcribers.map<[string, Transcriber_new]>((transcriber) => [
      transcriber.identifier,
      transcriber,
    ]),
    ...transcribers.map<[string, Transcriber_new]>((transcriber) => [
      transcriber.id,
      transcriber,
    ]),
  ]);
  const documentRepositoryMap = new Map(
    documentRepositories.map((repo) => [repo.id, repo]),
  );
  const modelMap = new Map(models.map((model) => [model.identifier, model]));
  const workspaceMap = new Map(
    workspaces.map((workspace) => [workspace.id, workspace]),
  );

  return (
    <>
      {favorites.favorites.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Star />
            </EmptyMedia>
            <EmptyTitle>{t("labelNoFavorites")}</EmptyTitle>
            <EmptyDescription>
              <Trans
                t={t}
                i18n={i18n}
                i18nKey="descriptionNoFavorites"
                components={{
                  agents: <Link href="/agent" />,
                  documents: <Link href="/app/documents" />,
                  transcribers: <Link href="/app/transcribe" />,
                }}
              />
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ContainerMain className="flex flex-wrap justify-center gap-3">
          {favorites.favorites.map((favorite) => (
            <Fragment key={`${favorite.type}:${favorite.id}`}>
              {favorite.type === "workspace" &&
              hasPermission({
                claim: workspaceMap.get(favorite.id)?.claim,
                permission: "user",
              }) ? (
                <WorkspaceCard
                  workspace={workspaceMap.get(favorite.id)}
                  favorites={favorites}
                />
              ) : undefined}
              {favorite.type === "agent" ? (
                <AgentCard
                  agent={agentMap.get(favorite.id)}
                  documentRepositoryMap={documentRepositoryMap}
                  favorites={favorites}
                  model={modelMap.get(
                    agentMap.get(favorite.id)?.modelIdentifier ?? "",
                  )}
                  workspace={workspaceMap.get(
                    agentMap.get(favorite.id)?.workspaceId ?? "",
                  )}
                />
              ) : undefined}

              {favorite.type === "transcriber" ? (
                <TranscriberCard
                  favorites={favorites}
                  model={modelMap.get(
                    transcriberMap.get(favorite.id)?.modelIdentifier ?? "",
                  )}
                  transcriber={transcriberMap.get(favorite.id)}
                  workspace={workspaceMap.get(
                    transcriberMap.get(favorite.id)?.workspaceId ?? "",
                  )}
                />
              ) : undefined}

              {favorite.type === "documentRepository" ? (
                <DocumentRepositoryCard
                  favorites={favorites}
                  embeddingModel={modelMap.get(
                    documentRepositoryMap.get(favorite.id)?.index?.embedding
                      ?.modelIdentifier ?? "",
                  )}
                  documentRepository={documentRepositoryMap.get(favorite.id)}
                  transcriber={transcriberMap.get(
                    documentRepositoryMap.get(favorite.id)
                      ?.transcriberIdentifier ?? "",
                  )}
                  workspace={workspaceMap.get(
                    documentRepositoryMap.get(favorite.id)?.workspaceId ?? "",
                  )}
                />
              ) : undefined}
            </Fragment>
          ))}
        </ContainerMain>
      )}
    </>
  );
}
