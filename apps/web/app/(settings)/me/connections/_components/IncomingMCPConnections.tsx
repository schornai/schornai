"use client";
import { useState } from "react";
import { DraftingCompass, X, XCircle } from "lucide-react";
import { useT } from "next-i18next/client";
import { useAction } from "next-safe-action/hooks";
import type { UserMcpGrant } from "@schornio/aibox-package-database/platformMcp/listUserGrants";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { Badge } from "@schornio/aibox-package-ui/components/badge";
import { FieldError } from "@schornio/aibox-package-ui/components/field";
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
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@schornio/aibox-package-ui/components/alert-dialog";
import { AlertDialogMediaDestructive } from "@schornio/aibox-package-ui/components/alert-dialog-media-destructive";
import { revokePlatformMcp } from "../_actions/revokePlatformMcp";

export function IncomingMCPConnections({
  grants,
  now,
}: {
  grants: UserMcpGrant[];
  now: string;
}) {
  const { t, i18n } = useT("me", { keyPrefix: "connections.incoming" });
  const { t: levelText } = useT("me", { keyPrefix: "platformMcp.level" });
  const [removing, setRemoving] = useState<UserMcpGrant | null>(null);
  const action = useAction(revokePlatformMcp, {
    onSuccess: () => setRemoving(null),
  });
  const date = (value: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(value));
  if (!grants.length) return null;
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2">
          <DraftingCompass />
          {t("labelTitle")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <ContainerTable>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("labelApplication")}</TableHead>
              <TableHead>{t("labelLevel")}</TableHead>
              <TableHead>{t("labelCreated")}</TableHead>
              <TableHead>{t("labelExpires")}</TableHead>
              <TableHead>
                <span className="sr-only">{t("labelRevoke")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grants.map((grant) => (
              <TableRow key={grant.id}>
                <TableCell className="max-w-sm min-w-48 whitespace-normal">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium break-all">{grant.name}</span>
                    <span className="text-muted-foreground text-xs break-all">
                      {grant.resource}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{levelText(grant.level)}</Badge>
                </TableCell>
                <TableCell>
                  <time dateTime={grant.createdAt}>
                    {date(grant.createdAt)} UTC
                  </time>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    {grant.expiresAt && (
                      <time dateTime={grant.expiresAt}>
                        {date(grant.expiresAt)} UTC
                      </time>
                    )}
                    {(!grant.expiresAt ||
                      Date.parse(grant.expiresAt) <= Date.parse(now)) && (
                      <Badge variant="outline">{t("labelExpired")}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="destructive"
                    size="icon-sm"
                    aria-label={t("labelRevokeNamed", { name: grant.name })}
                    title={t("labelRevoke")}
                    onClick={() => setRemoving(grant)}
                  >
                    <X />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ContainerTable>
      <AlertDialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open && !action.isPending) {
            setRemoving(null);
            action.reset();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMediaDestructive>
              <XCircle />
            </AlertDialogMediaDestructive>
            <AlertDialogTitle>{t("labelRevoke")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("descriptionRevoke", { name: removing?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {action.hasErrored && <FieldError>{t("errorRevoke")}</FieldError>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={action.isPending}>
              {t("labelCancel")}
            </AlertDialogCancel>
            <ButtonAction
              variant="destructive"
              isPending={action.isPending}
              hasErrored={action.hasErrored}
              disabled={action.isPending}
              onClick={() => {
                if (removing) action.execute({ grantId: removing.id });
              }}
            >
              {t("labelRevoke")}
            </ButtonAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
