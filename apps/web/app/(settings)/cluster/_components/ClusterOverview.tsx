import { GraphStar, PackageOpen, Server, SquareActivity } from "lucide-react";
import Link from "next/link";
import { getT } from "next-i18next/server";
import { getWorkspaceClaims } from "../../../_models/getWorkspaceClaims";
import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";

export async function ClusterOverview() {
  const [{ t }, { isAdmin }] = await Promise.all([
    getT("settings", { keyPrefix: "cluster" }),
    getWorkspaceClaims(),
  ]);
  const sections = [
    { href: "/service", icon: Server, key: "Service" },
    { href: "/tasks", icon: SquareActivity, key: "Tasks" },
    { href: "/artifacts", icon: PackageOpen, key: "Artifacts" },
  ];

  return (
    <>
      <HeaderMain>
        <HeaderMainContent>
          <GraphStar /> {t("labelTitle")}
        </HeaderMainContent>
      </HeaderMain>
      <ContainerMain className="flex flex-wrap justify-around gap-3">
        {isAdmin
          ? sections.map(({ href, icon: Icon, key }) => (
              <div key={href} className="w-96 max-w-full">
                <ContainerStyled
                  className="flex aspect-video flex-col items-center"
                  render={<Link href={href} />}
                  variant="card"
                >
                  <div className="bg-muted my-auto flex aspect-square w-36 items-center justify-center rounded-full">
                    <Icon className="size-10" />
                  </div>
                  <div className="mt-auto text-sm font-medium">
                    {t(`label${key}`)}
                  </div>
                </ContainerStyled>
                <div className="p-3 text-sm">{t(`description${key}`)}</div>
              </div>
            ))
          : undefined}
      </ContainerMain>
    </>
  );
}
