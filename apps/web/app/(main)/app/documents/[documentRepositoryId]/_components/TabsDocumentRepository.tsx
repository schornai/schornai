import { File, Info, Search } from "lucide-react";
import {
  TabsMainList,
  TabsMainTriggerBase,
} from "../../../../../_components/TabsMain";
import Link from "next/link";
import { getT } from "next-i18next/server";

export async function TabsDocumentRepository({
  documentRepositoryId,
  hasFulltextSearch,
  pathSegment,
}: {
  documentRepositoryId: string;
  hasFulltextSearch?: boolean;
  pathSegment: "files" | "search" | "info";
}) {
  const { t } = await getT("documentRepository", {
    keyPrefix: "_components.TabsDocumentRepository",
  });

  return (
    <TabsMainList className="mb-6" stickyTop>
      <TabsMainTriggerBase
        isCurrentView={pathSegment === "files"}
        nativeButton={false}
        render={
          <Link href={`/app/documents/${documentRepositoryId}/files`}>
            <File /> {t("tabFiles")}
          </Link>
        }
      />

      {hasFulltextSearch ? (
        <TabsMainTriggerBase
          isCurrentView={pathSegment === "search"}
          nativeButton={false}
          render={
            <Link href={`/app/documents/${documentRepositoryId}/search`}>
              <Search /> {t("tabSearch")}
            </Link>
          }
        />
      ) : undefined}

      <TabsMainTriggerBase
        isCurrentView={pathSegment === "info"}
        nativeButton={false}
        render={
          <Link href={`/app/documents/${documentRepositoryId}/info`}>
            <Info /> {t("tabInfo")}
          </Link>
        }
      />
    </TabsMainList>
  );
}
