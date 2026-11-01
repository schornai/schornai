import { Building2, KeyRound, Library, Lightbulb, Pencil } from "lucide-react";
import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import {
  TabsMainContent,
  TabsMainList,
  TabsMainListContext,
  TabsMainTrigger,
} from "../../../../_components/TabsMain";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { WorkspaceCard } from "../../../../(main)/workspace/_components/WorkspaceCard";
import { WorkspaceEditorAutoJoin } from "../_components/WorkspaceEditorAutoJoin";
import { WorkspaceEditorDescription } from "../_components/WorkspaceEditorDescription";
import { WorkspaceEditorDocs } from "../_components/WorkspaceEditorDocs";
import { WorkspaceEditorPermissions } from "./_components/WorkspaceEditorPermissions";
import { WorkspaceEditorSSOMappings } from "../_components/WorkspaceEditorSSOMappings";
import { getT } from "next-i18next/server";
import { getWorkspaceById } from "@schornio/aibox-package-database/workspace/getWorkspaceById";
import { notFound } from "next/navigation";
import { getWorkspaceAdminContext } from "@/lib/supabase/getWorkspaceAdminContext";

// Resolve the current user's workspace access before rendering admin controls.
export const instant = false;

export default async function (
  props: PageProps<"/settings/workspace/[workspaceId]">,
) {
  const { workspaceId } = await props.params;
  const [{ supabaseServiceRole, isGlobalAdmin }, { t }] = await Promise.all([
    getWorkspaceAdminContext(workspaceId),
    getT("settings", { keyPrefix: "workspaceDetail.page" }),
  ]);
  const workspace = await getWorkspaceById(workspaceId, {
    supabase: supabaseServiceRole,
  });

  if (!workspace) {
    notFound();
  }

  return (
    <TabsMainListContext searchParamView="section">
      <HeaderMain>
        <HeaderMainContent>
          <Library /> {t("labelTitle")}
        </HeaderMainContent>
      </HeaderMain>

      <ContainerMain className="flex justify-center">
        <WorkspaceCard isAdminView workspace={workspace} />
      </ContainerMain>

      <TabsMainList stickyTop>
        <TabsMainTrigger view="default">
          <Pencil /> {t("tabEdit")}
        </TabsMainTrigger>
        <TabsMainTrigger view="docs">
          <Lightbulb /> {t("tabDocs")}
        </TabsMainTrigger>
        {isGlobalAdmin && (
          <>
            <TabsMainTrigger view="permissions">
              <KeyRound /> {t("tabPermissions")}
            </TabsMainTrigger>
            <TabsMainTrigger view="sso-mappings">
              <Building2 />
              {t("tabSsoMappings")}
            </TabsMainTrigger>
          </>
        )}
      </TabsMainList>

      <TabsMainContent view="default">
        <WorkspaceEditorDescription
          defaultDescription={workspace.description}
          defaultName={workspace.name}
          workspaceId={workspaceId}
        />

        {isGlobalAdmin && (
          <>
            <hr className="my-10" />
            <WorkspaceEditorAutoJoin
              autoJoin={workspace.autoJoin}
              workspaceId={workspaceId}
            />
          </>
        )}
      </TabsMainContent>

      <TabsMainContent view="docs">
        <WorkspaceEditorDocs
          defaultDocs={workspace.documentation}
          workspaceId={workspaceId}
        />
      </TabsMainContent>

      {isGlobalAdmin && (
        <>
          <TabsMainContent view="permissions">
            <WorkspaceEditorPermissions workspaceId={workspaceId} />
          </TabsMainContent>
          <TabsMainContent view="sso-mappings">
            <WorkspaceEditorSSOMappings
              defaultSamlMappingEditor={workspace.samlMappingEditor}
              defaultSamlMappingUser={workspace.samlMappingUser}
              defaultSamlMappingWorkspaceAdmin={
                workspace.samlMappingWorkspaceAdmin
              }
              workspaceId={workspaceId}
            />
          </TabsMainContent>
        </>
      )}
    </TabsMainListContext>
  );
}
