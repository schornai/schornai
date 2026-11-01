import { Building2, KeyRound, Pencil, UsersRound } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@schornio/aibox-package-ui/components/empty";
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
import { AvatarUser } from "@schornio/aibox-package-ui/components/avatar-user";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import { EditorAvatar } from "../../../_components/EditorAvatar";
import { EditorName } from "../../../_components/EditorName";

import { UserResetKey } from "./_components/UserResetKey";
import { UserEditorPermissions } from "./_components/UserEditorPermissions";
import { getT } from "next-i18next/server";
import { getUserById } from "@schornio/aibox-package-database/user/getUserById";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";

export default async function Page(
  props: PageProps<"/settings/user/[userId]">,
) {
  const [{ userId }, supabaseServiceRole, { t }] = await Promise.all([
    props.params,
    saveCreateSupabaseServiceRoleClient(),
    getT("settings", { keyPrefix: "userDetail.page" }),
  ]);

  const user = await getUserById(userId, { supabaseServiceRole });

  return (
    <TabsMainListContext searchParamView="section">
      <HeaderMain>
        <HeaderMainContent>
          <UsersRound />
          {t("labelTitle")}
        </HeaderMainContent>
      </HeaderMain>

      <ContainerMain>
        <ContainerStyled
          className="mx-auto flex aspect-video w-56 flex-col items-center justify-center"
          variant="card"
        >
          <AvatarUser
            avatarUrl={user.avatarUrl}
            className="mb-2"
            firstName={user.firstName}
            lastName={user.lastName}
            size2XL
          />
          <div>{user.name}</div>
          <div className="text-sm">{user.email}</div>
        </ContainerStyled>
      </ContainerMain>

      <TabsMainList stickyTop>
        <TabsMainTrigger view="default">
          <Pencil /> {t("tabEdit")}
        </TabsMainTrigger>
        <TabsMainTrigger view="permissions">
          <KeyRound /> {t("tabPermissions")}
        </TabsMainTrigger>
      </TabsMainList>

      <TabsMainContent view="default">
        <EditorAvatar
          hasOwnAvatar={Boolean(user.ownAvatarUrl)}
          avatarUrl={user.avatarUrl}
          firstName={user.firstName}
          lastName={user.lastName}
          targetUserId={user.id}
          userId={user.id}
        />

        <hr className="my-10" />

        <EditorName
          defaultFirstName={user.firstName}
          defaultLastName={user.lastName}
          targetUserId={user.id}
        />
        <hr className="my-10" />
        <ContainerMain>
          <UserResetKey
            key={user.id}
            userId={user.id}
            isLocal={user.signInMethod === "email"}
          />
        </ContainerMain>
      </TabsMainContent>

      <TabsMainContent view="permissions">
        {user.signInMethod === "sso" ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Building2 />
              </EmptyMedia>
              <EmptyTitle>{t("ssoTitle")}</EmptyTitle>
              <EmptyDescription>{t("ssoDescription")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : undefined}
        {user.signInMethod === "email" ? (
          <UserEditorPermissions userId={user.id} />
        ) : undefined}
      </TabsMainContent>
    </TabsMainListContext>
  );
}
