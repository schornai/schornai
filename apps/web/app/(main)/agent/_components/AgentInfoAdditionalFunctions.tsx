"use client";

import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import {
  ChevronsUpDown,
  ClockFading,
  Ellipsis,
  Goal,
  Layers,
  MoonStar,
  Paperclip,
  Pencil,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { Fragment } from "react/jsx-runtime";
import { InfoActions } from "../../../_components/InfoActions";
import { InfoTitle } from "../../../_components/InfoTitle";
import Link from "next/link";
import { defaultAgentEnabledAdditionalFunctions } from "@/lib/defaultAgentEnabledAdditionalFunctions";
import { useState } from "react";
import { useT } from "next-i18next/client";

const order: string[] = [
  "fileUpload",
  "batch",
  "pursueGoal",
  "nightshift",
  "disappearingChats",
] satisfies (keyof Agent["additionalFunctions"])[];

export function AgentInfoAdditionalFunctions({
  agent,
  editAgentPathname,
  editable,
}: {
  agent?: Partial<Agent>;
  editAgentPathname?: string;
  editable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentInfoAdditionalFunctions",
  });

  const enabledFunctions = Object.entries(
    agent?.additionalFunctions ?? defaultAgentEnabledAdditionalFunctions,
  )
    .filter(([, entry]) => entry)
    .map(([key]) => key)
    .toSorted((a, b) => order.indexOf(a) - order.indexOf(b));

  if (enabledFunctions.length === 0) {
    return undefined;
  }

  return (
    <Alert>
      <Ellipsis />
      <Collapsible open={open} onOpenChange={setOpen}>
        <InfoTitle>
          <CollapsibleTrigger className="flex-1 text-left">
            {t("labelTitle")}
          </CollapsibleTrigger>
          <InfoActions>
            {editable ? (
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={`${editAgentPathname ?? ""}?view=settings#additionalFunctions`}
                  />
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
          {open ? undefined : (
            <strong>
              {enabledFunctions.map((enabledFunction, index) => (
                <Fragment key={enabledFunction}>
                  <span className="inline-block">
                    {enabledFunction === "fileUpload" ? (
                      <>
                        <Paperclip className="inline size-4" />{" "}
                        {t("labelFileUpload")}
                      </>
                    ) : undefined}
                    {enabledFunction === "batch" ? (
                      <>
                        <Layers className="inline size-4" /> {t("labelBatch")}
                      </>
                    ) : undefined}
                    {/* {enabledFunction === "pursueGoal" ? (
                      <>
                        <Goal className="inline size-4" />{" "}
                        {t("labelPursueGoal")}
                      </>
                    ) : undefined}
                    {enabledFunction === "nightshift" ? (
                      <>
                        <MoonStar className="inline size-4" />{" "}
                        {t("labelNightshift")}
                      </>
                    ) : undefined}
                    {enabledFunction === "disappearingChats" ? (
                      <>
                        <ClockFading className="inline size-4" />{" "}
                        {t("labelDisappearingChats")}
                      </>
                    ) : undefined} */}
                    {index + 1 < enabledFunctions.length ? "," : undefined}
                  </span>{" "}
                </Fragment>
              ))}
            </strong>
          )}
          <CollapsibleContent>
            <ul>
              {enabledFunctions.map((enabledFunction) => (
                <Fragment key={enabledFunction}>
                  {enabledFunction === "fileUpload" ? (
                    <li>
                      <strong>
                        <Paperclip className="inline size-4" />{" "}
                        {t("labelFileUpload")}
                      </strong>
                      <p>{t("descriptionFileUpload")}</p>
                    </li>
                  ) : undefined}
                  {enabledFunction === "batch" ? (
                    <li>
                      <strong>
                        <Layers className="inline size-4" /> {t("labelBatch")}
                      </strong>
                      <p>{t("descriptionBatch")}</p>
                    </li>
                  ) : undefined}
                  {enabledFunction === "pursueGoal" ? (
                    <li>
                      <strong>
                        <Goal className="inline size-4" />{" "}
                        {t("labelPursueGoal")}
                      </strong>
                      <p>{t("descriptionPursueGoal")}</p>
                    </li>
                  ) : undefined}
                  {enabledFunction === "nightshift" ? (
                    <li>
                      <strong>
                        <MoonStar className="inline size-4" />{" "}
                        {t("labelNightshift")}
                      </strong>
                      <p>{t("descriptionNightshift")}</p>
                    </li>
                  ) : undefined}
                  {enabledFunction === "disappearingChats" ? (
                    <li>
                      <strong>
                        <ClockFading className="inline size-4" />{" "}
                        {t("labelDisappearingChats")}
                      </strong>
                      <p>{t("descriptionDisappearingChats")}</p>
                    </li>
                  ) : undefined}
                </Fragment>
              ))}
            </ul>
          </CollapsibleContent>
        </AlertDescription>
      </Collapsible>
    </Alert>
  );
}
