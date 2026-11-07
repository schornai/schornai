import Link from "next/link";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@schornio/aibox-package-ui/components/alert";
import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { Info, UserRound, Star, Shield, Plug } from "lucide-react";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { EditorAvatar } from "../../_components/EditorAvatar";
import { EditorName } from "../../_components/EditorName";
import { getCurrentUserProfile } from "../../../_models/getCurrentUserProfile";
import { getT } from "next-i18next/server";
import { notFound } from "next/navigation";

export default async function Page() {
  const [userProfile, { t }] = await Promise.all([
    getCurrentUserProfile(),
    getT("me", { keyPrefix: "page" }),
  ]);

  if (!userProfile) {
    notFound();
  }

  return (
    <>
      <HeaderMain>
        <HeaderMainContent>
          <UserRound />
          {t("title")}
        </HeaderMainContent>
      </HeaderMain>

      <EditorAvatar
        hasOwnAvatar={Boolean(userProfile.ownAvatarUrl)}
        avatarUrl={userProfile.avatarUrl}
        firstName={userProfile.firstName}
        lastName={userProfile.lastName}
        userId={userProfile.id}
      />

      <hr />

      <EditorName
        defaultFirstName={userProfile.firstName}
        defaultLastName={userProfile.lastName}
      />

      <hr className="my-10" />

      <ContainerMain className="flex flex-wrap justify-around gap-3">
        {[
          {
            href: "/me/favorites",
            Icon: Star,
            label: "cardFavoritesLabel",
            description: "cardFavoritesDescription",
          },
          {
            href: "/me/permissions",
            Icon: Shield,
            label: "cardPermissionsLabel",
            description: "cardPermissionsDescription",
          },
          {
            href: "/me/connections",
            Icon: Plug,
            label: "cardConnectionsLabel",
            description: "cardConnectionsDescription",
          },
        ].map(({ href, Icon, label, description }) => (
          <div className="w-96" key={href}>
            <ContainerStyled
              className="flex aspect-video flex-col items-center"
              render={<Link href={href} />}
              variant="card"
            >
              <div className="bg-muted my-auto flex aspect-square w-36 items-center justify-center rounded-full">
                <Icon className="size-10" />
              </div>
              <div className="mt-auto text-sm font-medium">{t(label)}</div>
            </ContainerStyled>
            <div className="p-3 text-sm">{t(description)}</div>
          </div>
        ))}
      </ContainerMain>

      <ContainerMain className="flex flex-col gap-3" size="narrow">
        <h2 title="Help">
          <Info className="mx-auto" size={40} />
        </h2>
        <Alert>
          <UserRound />
          <AlertTitle>{t("infoPersonalize")}</AlertTitle>
          <AlertDescription>{t("infoPersonalizeDescription")}</AlertDescription>
        </Alert>
      </ContainerMain>
    </>
  );
}
