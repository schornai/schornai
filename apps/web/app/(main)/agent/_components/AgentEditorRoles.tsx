"use client";

import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@schornio/aibox-package-ui/components/empty";
import { Info, PencilRuler, Plus, Shapes } from "lucide-react";
import { AgentEditorRole } from "./AgentEditorRole";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { useAgentEditor } from "./AgentEditor";
import { useT } from "next-i18next/client";

export function AgentEditorRoles() {
  const { agent, setAgent } = useAgentEditor();
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentEditorRoles",
  });

  return (
    <>
      {agent?.roles?.map((role, index) => (
        <AgentEditorRole role={role} roleIndex={index} key={role.id} />
      ))}

      {(agent?.roles?.length ?? 0) === 0 ? (
        <>
          <ContainerMain>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Shapes />
                </EmptyMedia>
                <EmptyTitle>{t("labelNoRoles")}</EmptyTitle>
                <EmptyDescription>{t("descriptionNoRoles")}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </ContainerMain>

          <hr className="my-10" />
        </>
      ) : undefined}

      <ContainerMain>
        <Button
          onClick={() =>
            setAgent((prev) => ({
              ...prev,
              roles: [
                ...(prev?.roles ?? []),
                {
                  documentRepositoryMounts: [],
                  id: crypto.randomUUID(),
                  prompt: "",
                },
              ],
            }))
          }
        >
          {t("labelAddRole")} <Plus />
        </Button>
      </ContainerMain>

      <hr className="my-10" />

      <ContainerMain className="flex flex-col gap-3" size="narrow">
        <h2 title="Help">
          <Info className="mx-auto" size={40} />
        </h2>

        <Alert>
          <Shapes />
          <AlertDescription>{t("infoMultipleRoles")}</AlertDescription>
        </Alert>

        <Alert>
          <PencilRuler />
          <AlertDescription>{t("infoTools")}</AlertDescription>
        </Alert>
      </ContainerMain>
    </>
  );
}
