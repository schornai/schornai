"use client";

import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { ChevronsUpDown, Pencil, Search } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import { Badge } from "@schornio/aibox-package-ui/components/badge";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { InfoActions } from "../../../../../_components/InfoActions";
import { InfoTitle } from "../../../../../_components/InfoTitle";
import Link from "next/link";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { useT } from "next-i18next/client";

export function DocumentRepositoryInfoIndexKeyword({
  editPathname,
  editDefaultIndexKeywordActive,
  editable,
  indexKeywordActive,
}: {
  editPathname?: string;
  editDefaultIndexKeywordActive?: boolean;
  editable?: boolean;
  indexKeywordActive?: boolean;
}) {
  const { t } = useT("agent", {
    keyPrefix: "_components.DocumentRepositoryInfoIndexKeyword",
  });

  const changed =
    editable &&
    (editDefaultIndexKeywordActive ?? false) !== (indexKeywordActive ?? false);

  return (
    <Alert className={cn({ "border-foreground border-dashed": changed })}>
      <Search />
      <Collapsible>
        <InfoTitle>
          <CollapsibleTrigger className="flex-1 text-left">
            {t("labelTitle")}
          </CollapsibleTrigger>
          <InfoActions>
            {changed ? <Badge>{t("labelChanged")}</Badge> : undefined}

            {editable ? (
              <Button
                nativeButton={false}
                render={
                  <Link href={`${editPathname ?? ""}?view=features#index`} />
                }
                size="icon-xs"
                variant="ghost"
              >
                <Pencil />
              </Button>
            ) : undefined}

            <CollapsibleTrigger
              render={
                <Button size="icon-xs" variant="ghost">
                  <ChevronsUpDown />
                </Button>
              }
            />
          </InfoActions>
        </InfoTitle>
        <AlertDescription>
          <div className="flex gap-1">
            <strong>
              {indexKeywordActive ? t("labelActive") : t("labelInactive")}
            </strong>
          </div>
          <CollapsibleContent>
            <AlertDescription>{t("description")}</AlertDescription>
          </CollapsibleContent>
        </AlertDescription>
      </Collapsible>
    </Alert>
  );
}
