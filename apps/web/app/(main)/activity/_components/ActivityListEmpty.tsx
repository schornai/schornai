"use client";

import { BotMessageSquare, History } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@schornio/aibox-package-ui/components/empty";
import { Button } from "@schornio/aibox-package-ui/components/button";
import Link from "next/link";
import { useT } from "next-i18next/client";

export function ActivityListEmpty() {
  const { t } = useT("activity", {
    keyPrefix: "_components.ActivityListEmpty",
   });

  return (
     <Empty>
       <EmptyHeader>
         <EmptyMedia variant="icon">
           <History />
         </EmptyMedia>
         <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
         <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
         <EmptyContent className="flex flex-row justify-center gap-2">
           <Button
            nativeButton={false}
            render={<Link href="/agent" />}
            size="sm"
            variant="outline"
           >
             <BotMessageSquare /> {t("emptyLabelAgents")}
           </Button>
         </EmptyContent>
       </EmptyHeader>
     </Empty>
    );
}
