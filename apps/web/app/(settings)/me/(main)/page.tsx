import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@schornio/aibox-package-ui/components/alert";
import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { Info, UserRound } from "lucide-react";
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
