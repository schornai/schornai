import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@schornio/aibox-package-ui/components/empty";
import { FolderOpen, SearchIcon } from "lucide-react";
import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import InputQuery from "./_components/InputQuery";
import Search from "./_components/Search";
import SearchPending from "./_components/SearchPending";
import { Suspense } from "react";
import { TabsDocumentRepository } from "../_components/TabsDocumentRepository";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getDocumentRepositoryById } from "@schornio/aibox-package-database/documentRepositories/getDocumentRepositoryById";
import { getT } from "next-i18next/server";
import { notFound } from "next/navigation";
import { tryAsync } from "@schornio/aibox-package-utils/tryAsync";

export default async function Page(
  props: PageProps<"/app/documents/[documentRepositoryId]/search">,
) {
  const [
    { documentRepositoryId },
    { query: querySearchParam },
    supabase,
    { t },
  ] = await Promise.all([
    props.params,
    props.searchParams,
    createSupabaseServerClient(),
    getT("documentRepository", { keyPrefix: "_components.Search" }),
  ]);

  const { data: documentRepository } = await tryAsync(() =>
    getDocumentRepositoryById(documentRepositoryId, { supabase }),
  );

  if (!documentRepository) {
    notFound();
  }

  const query = Array.isArray(querySearchParam)
    ? querySearchParam.join(" ")
    : (querySearchParam ?? "");

  return (
    <>
      <HeaderMain appColor={documentRepository.color}>
        <HeaderMainContent>
          <FolderOpen />
          {documentRepository.name}
        </HeaderMainContent>
      </HeaderMain>

      <TabsDocumentRepository
        documentRepositoryId={documentRepository.id}
        hasFulltextSearch={
          documentRepository.index?.embedding?.active ||
          documentRepository.index?.keyword?.active
        }
        pathSegment="search"
      />

      <ContainerMain className="mb-10 flex flex-col items-center justify-center gap-3 py-0">
        <h2 className="text-sm font-medium">{t("emptyTitle")}</h2>
        <InputQuery />
      </ContainerMain>

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
        <Suspense
          fallback={<SearchPending query={query} title={t("emptyTitle")} />}
        >
          <Search documentRepository={documentRepository} query={query} />
        </Suspense>
      )}
    </>
  );
}
