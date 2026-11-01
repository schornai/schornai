"use client";

import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { Calculator, ChevronsUpDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { InfoActions } from "../../../_components/InfoActions";
import { InfoTitle } from "../../../_components/InfoTitle";
import { useT } from "next-i18next/client";

export function AgentInfoToolCalculator({
  agentRole,
}: {
  agentRole?: Partial<Agent["roles"][number]>;
}) {
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentInfoToolCalculator",
  });

  return (
    <Alert>
      <Calculator />
      <Collapsible>
        <InfoTitle>
          <CollapsibleTrigger className="flex-1 text-left">
            {t("labelTitle")}
          </CollapsibleTrigger>
          <InfoActions>
            <strong>{agentRole?.name}</strong>
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
          <CollapsibleContent>
            <AlertDescription className="pt-3">
              {t("description")}
            </AlertDescription>
          </CollapsibleContent>
        </AlertDescription>
      </Collapsible>
    </Alert>
  );
}
