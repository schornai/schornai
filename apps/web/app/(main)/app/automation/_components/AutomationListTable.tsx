"use client";
import { Fragment } from "react";
import Link from "next/link";
import { useT } from "next-i18next/client";
import { NO_GROUP_KEY, toKey } from "@/lib/groupSortView/hook";
import { AutomationNextRun } from "./AutomationNextRun";
import { AutomationAvatar } from "./AutomationAvatar";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ContainerTable } from "@schornio/aibox-package-ui/components/container-table";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@schornio/aibox-package-ui/components/table";
import { AutomationIconGroupActions } from "./AutomationIconGroupActions";
import { AutomationIconGroupInfos } from "./AutomationIconGroupInfos";
import { useAutomationList } from "./AutomationListProvider";
export function AutomationListTable() {
  const { t } = useT("automation");
  const { itemGroups, group, favorites } = useAutomationList();
  return (
    <ContainerMain>
      <ContainerTable>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("labelName")}</TableHead>
              <TableHead>{t("labelInformation")}</TableHead>
              <TableHead>{t("labelNextRun")}</TableHead>
              <TableHead className="text-right">{t("labelActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itemGroups.map(([groupId, items]) => (
              <Fragment key={toKey(groupId)}>
                {groupId !== NO_GROUP_KEY && (
                  <TableRow>
                    <TableCell colSpan={4} className="bg-muted font-medium">
                      {group === "first-letter"
                        ? String(groupId)
                        : t(`options.${String(groupId)}`)}
                    </TableCell>
                  </TableRow>
                )}
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link
                        className="flex items-center gap-1"
                        href={`/app/automation/${item.id}/info`}
                      >
                        <AutomationAvatar
                          icon={item.icon}
                          fallback={item.name}
                        />
                        <ContainerStyled
                          appColor={item.color}
                          className="size-4 rounded-full"
                        />
                        {item.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <AutomationIconGroupInfos automation={item} />
                    </TableCell>

                    <TableCell>
                      <AutomationNextRun automation={item} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <AutomationIconGroupActions
                          automation={item}
                          favorites={favorites}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </ContainerTable>
    </ContainerMain>
  );
}
