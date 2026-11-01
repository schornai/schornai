import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@schornio/aibox-package-ui/components/empty";
import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { AddSSOProvider } from "./_components/AddSSOProvider";
import { Building2 } from "lucide-react";
import { SAMLMetadataDownload } from "./_components/SAMLMetadataDownload";
import { DeleteSSOProvider } from "./_components/DeleteSSOProvider";
import EditSAMLAttributeMapping from "./_components/EditSAMLAttributeMapping";
import { getSSOProvider } from "@schornio/aibox-package-database/sso/getSSOProvider";
import { getT } from "next-i18next/server";
import { saveGetSupabaseServiceRoleConfig } from "@/lib/supabase/saveGetSupabaseServiceRoleConfig";
import { tryAsync } from "@schornio/aibox-package-utils/tryAsync";

export default async function Page() {
  const supabaseServiceRoleConfig = await saveGetSupabaseServiceRoleConfig();
  const [{ data: sso }, { t }] = await Promise.all([
    tryAsync(() => getSSOProvider({ supabaseServiceRoleConfig })),
    getT("settings", { keyPrefix: "sso.page" }),
  ]);

  return (
    <>
      <HeaderMain>
        <HeaderMainContent>
          <Building2 /> {t("labelTitle")}
        </HeaderMainContent>
      </HeaderMain>
      {sso ? (
        <>
          <Empty>
            <EmptyHeader>
              <EmptyMedia
                className="bg-green-500/10 text-green-500 dark:bg-green-500/20"
                variant="icon"
              >
                <Building2 />
              </EmptyMedia>
              <EmptyTitle>{t("activeTitle")}</EmptyTitle>
              <EmptyDescription>
                {new URL(sso.saml.entity_id).host}
                <br />
                {t("activeDescription")}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <SAMLMetadataDownload />
            </EmptyContent>
          </Empty>

          <EditSAMLAttributeMapping ssoProvider={sso} />

          <hr className="my-10" />

          <DeleteSSOProvider />
        </>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 />
            </EmptyMedia>
            <EmptyTitle>{t("inactiveTitle")}</EmptyTitle>
            <EmptyDescription>{t("inactiveDescription")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center gap-2">
            <AddSSOProvider />
            <SAMLMetadataDownload />
          </EmptyContent>
        </Empty>
      )}
    </>
  );
}
