import {
  HeaderMain,
  HeaderMainAsideContent,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { ActivityList } from "./_components/ActivityList";
import { ActivityListOptionsDropdown } from "./_components/ActivityListOptionsDropdown";
import { ActivityListProvider } from "./_components/ActivityListProvider";
import { History } from "lucide-react";
import { getGroupSortViewPreferences } from "@/lib/groupSortView/model";
import { getT } from "next-i18next/server";

export default async function Page() {
  const [{ t }, groupSortViewPreferences] = await Promise.all([
    getT("activity", { keyPrefix: "page" }),
    getGroupSortViewPreferences("/activity"),
  ]);

  return (
    <ActivityListProvider
      id="/activity"
      userPreferences={groupSortViewPreferences}
    >
      <HeaderMain>
        <HeaderMainContent>
          <History />
          {t("titleHistory")}
        </HeaderMainContent>
        <HeaderMainAsideContent>
          <ActivityListOptionsDropdown />
        </HeaderMainAsideContent>
      </HeaderMain>

      <ActivityList />
    </ActivityListProvider>
  );
}
