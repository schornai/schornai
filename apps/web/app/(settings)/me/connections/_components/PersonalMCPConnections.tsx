"use client";

import { Plug, Unplug } from "lucide-react";
import { useT } from "next-i18next/client";
import type { UserMcpGrant } from "@schornio/aibox-package-database/platformMcp/listUserGrants";
import { ContainerTable } from "@schornio/aibox-package-ui/components/container-table";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@schornio/aibox-package-ui/components/table";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@schornio/aibox-package-ui/components/empty";
import { IncomingMCPConnections } from "./IncomingMCPConnections";
import { MCPDisconnectButton } from "./MCPDisconnectButton";

export function PersonalMCPConnections({
  grants,
  serverUrls,
  now,
}: {
  grants: UserMcpGrant[];
  serverUrls: string[];
  now: string;
}) {
  const { t } = useT("me", { keyPrefix: "connections.page" });
  if (!grants.length && !serverUrls.length)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Unplug />
          </EmptyMedia>
          <EmptyTitle>{t("labelEmpty")}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  return (
    <div className="flex flex-col gap-8">
      <IncomingMCPConnections grants={grants} now={now} />
      {serverUrls.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2">
              <Plug />
              {t("labelOutgoing")}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t("descriptionOutgoing")}
            </p>
          </div>
          <ContainerTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("labelServer")}</TableHead>
                  <TableHead>
                    <span className="sr-only">{t("labelDisconnect")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serverUrls.map((serverUrl) => (
                  <TableRow key={serverUrl}>
                    <TableCell className="whitespace-normal">
                      <span className="font-medium break-all">{serverUrl}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <MCPDisconnectButton serverUrl={serverUrl} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ContainerTable>
        </section>
      )}
    </div>
  );
}
