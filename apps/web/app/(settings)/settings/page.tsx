import {
  Building2,
  Library,
  PackageOpen,
  Paintbrush,
  Settings,
  UsersRound,
} from "lucide-react";
import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import Link from "next/link";
import { getT } from "next-i18next/server";
import { getWorkspaceClaims } from "../../_models/getWorkspaceClaims";

export default async function Page() {
  const [{ t }, { isAdmin }] = await Promise.all([
    getT("settings", { keyPrefix: "page" }),
    getWorkspaceClaims(),
  ]);

  return (
    <>
      <HeaderMain>
        <HeaderMainContent>
          <Settings /> {t("labelTitle")}
        </HeaderMainContent>
      </HeaderMain>

      <ContainerMain className="flex flex-wrap justify-around gap-3">
        {isAdmin ? (
          <>
            <div className="w-96">
              <ContainerStyled
                className="flex aspect-video flex-col items-center"
                render={<Link href="/settings/user" />}
                variant="card"
              >
                <div className="bg-muted my-auto flex aspect-square w-36 items-center justify-center rounded-full">
                  <UsersRound className="size-10" />
                </div>
                <div className="mt-auto text-sm font-medium">
                  {t("cardUsersLabel")}
                </div>
              </ContainerStyled>

              <div className="p-3 text-sm">{t("cardUsersDescription")}</div>
            </div>

            <div className="w-96">
              <ContainerStyled
                className="flex aspect-video flex-col items-center"
                render={<Link href="/settings/workspace" />}
                variant="card"
              >
                <div className="bg-muted my-auto flex aspect-square w-36 items-center justify-center rounded-full">
                  <Library className="size-10" />
                </div>
                <div className="mt-auto text-sm font-medium">
                  {t("cardWorkspacesLabel")}
                </div>
              </ContainerStyled>

              <div className="p-3 text-sm">
                {t("cardWorkspacesDescription")}
              </div>
            </div>

            <div className="w-96">
              <ContainerStyled
                className="flex aspect-video flex-col items-center"
                render={<Link href="/settings/sso" />}
                variant="card"
              >
                <div className="bg-muted my-auto flex aspect-square w-36 items-center justify-center rounded-full">
                  <Building2 className="size-10" />
                </div>
                <div className="mt-auto text-sm font-medium">
                  {t("cardSsoLabel")}
                </div>
              </ContainerStyled>

              <div className="p-3 text-sm">{t("cardSsoDescription")}</div>
            </div>

            <div className="w-96">
              <ContainerStyled
                className="flex aspect-video flex-col items-center"
                render={<Link href="/settings/xrag" />}
                variant="card"
              >
                <div className="bg-muted my-auto flex aspect-square w-36 items-center justify-center rounded-full">
                  <PackageOpen className="size-10" />
                </div>
                <div className="mt-auto text-sm font-medium">
                  {t("cardXragLabel")}
                </div>
              </ContainerStyled>

              <div className="p-3 text-sm">{t("cardXragDescription")}</div>
            </div>

            <div className="w-96">
              <ContainerStyled
                className="flex aspect-video flex-col items-center"
                render={<Link href="/settings/theme" />}
                variant="card"
              >
                <div className="bg-muted my-auto flex aspect-square w-36 items-center justify-center rounded-full">
                  <Paintbrush className="size-10" />
                </div>
                <div className="mt-auto text-sm font-medium">
                  {t("cardAppearanceLabel")}
                </div>
              </ContainerStyled>

              <div className="p-3 text-sm">
                {t("cardAppearanceDescription")}
              </div>
            </div>
          </>
        ) : undefined}
      </ContainerMain>
    </>
  );
}
