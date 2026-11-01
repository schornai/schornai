"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "@schornio/aibox-package-ui/components/sidebar";
import { ChevronDown } from "lucide-react";
import { SidebarActivitesMenuItem } from "./SidebarActivitesMenuItem";
import { useActivites } from "./ActivityContextProvider";
import { useT } from "next-i18next/client";

export function SidebarActivitesRealtime() {
  const { last30Days, last7Days, today, pinnedActivities } = useActivites();
  const { t } = useT("activity", {
    keyPrefix: "_components.SidebarActivitesRealtime",
  });

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>{t("labelHistory")}</SidebarGroupLabel>
      <SidebarMenu>
        {pinnedActivities.length > 0 ? (
          <Collapsible className="group/collapsible" defaultOpen>
            <SidebarMenuItem>
              <SidebarMenuButton render={<CollapsibleTrigger />}>
                {t("labelPinned")}
                <ChevronDown className="ms-auto transition-transform group-data-open/collapsible:rotate-180" />
              </SidebarMenuButton>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {pinnedActivities.map((activity) => (
                    <SidebarActivitesMenuItem
                      activity={activity}
                      key={activity.id}
                    />
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ) : undefined}

        <Collapsible className="group/collapsible" defaultOpen>
          <SidebarMenuItem>
            <SidebarMenuButton render={<CollapsibleTrigger />}>
              {t("labelToday")}
              <ChevronDown className="ms-auto transition-transform group-data-open/collapsible:rotate-180" />
            </SidebarMenuButton>
            <CollapsibleContent>
              <SidebarMenuSub>
                {today.length === 0 ? (
                  <SidebarMenuSubItem className="text-muted-foreground text-xs">
                    {t("labelEmpty")}
                  </SidebarMenuSubItem>
                ) : undefined}
                {today.map((activity) => (
                  <SidebarActivitesMenuItem
                    activity={activity}
                    key={activity.id}
                  />
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>

        <Collapsible className="group/collapsible">
          <SidebarMenuItem>
            <SidebarMenuButton render={<CollapsibleTrigger />}>
              {t("labelLast7Days")}
              <ChevronDown className="ms-auto transition-transform group-data-open/collapsible:rotate-180" />
            </SidebarMenuButton>
            <CollapsibleContent>
              <SidebarMenuSub>
                {last7Days.length === 0 ? (
                  <SidebarMenuSubItem className="text-muted-foreground text-xs">
                    {t("labelEmpty")}
                  </SidebarMenuSubItem>
                ) : undefined}
                {last7Days.map((activity) => (
                  <SidebarActivitesMenuItem
                    activity={activity}
                    key={activity.id}
                  />
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>

        <Collapsible className="group/collapsible">
          <SidebarMenuItem>
            <SidebarMenuButton render={<CollapsibleTrigger />}>
              {t("labelLast30Days")}
              <ChevronDown className="ms-auto transition-transform group-data-open/collapsible:rotate-180" />
            </SidebarMenuButton>
            <CollapsibleContent>
              <SidebarMenuSub>
                {last30Days.length === 0 ? (
                  <SidebarMenuSubItem className="text-muted-foreground text-xs">
                    {t("labelEmpty")}
                  </SidebarMenuSubItem>
                ) : undefined}
                {last30Days.map((activity) => (
                  <SidebarActivitesMenuItem
                    activity={activity}
                    key={activity.id}
                  />
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      </SidebarMenu>
    </SidebarGroup>
  );
}
