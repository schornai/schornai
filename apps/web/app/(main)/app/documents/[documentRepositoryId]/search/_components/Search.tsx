import { getRealtimeServerToken } from "@schornio/aibox-realtime/server/getRealtimeServerToken";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@schornio/aibox-package-ui/components/empty";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import { SearchIcon } from "lucide-react";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import StorageSearchResult from "../../../../../../_components/StorageSearchResult";
import { aiboxModelEmbedding } from "@schornio/aibox-realtime/_lib/aiboxModelEmbedding";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getT } from "next-i18next/server";
import { searchDocuments } from "@schornio/aibox-package-database/documentRepositories/searchDocuments";

export default async function Search({
  documentRepository,
  query = "",
}: {
  documentRepository: DocumentRepository;
  query?: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { t } = await getT("documentRepository", {
    keyPrefix: "_components.Search",
  });

  const websocketProvider = new ServerRealtimeWebsocketProvider();

  const result = await searchDocuments(
    documentRepository,
    {
      keywords: query.split(" "),
      semantic: query,
    },
    {
      embeddingModel: (modelId) =>
        aiboxModelEmbedding(modelId, {
          serverToken: getRealtimeServerToken(),
          websocketProvider,
        }),
      supabase,
    },
  );

  const storage = {
    documentRepositoryId: documentRepository.id,
    type: "documentRepository" as const,
    workspaceId: documentRepository.workspaceId,
  };

  const resultDocuments = [
    ...result.documentsByKeywords,
    ...result.documentsBySemantic,
  ];

  return (
    <>
      {query.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <SearchIcon />
            </EmptyMedia>
            <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
            <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <StorageSearchResult
          basePathApp={`/app/documents/${documentRepository.id}/files`}
          storage={storage}
          results={resultDocuments}
        />
      )}
    </>
  );
}
