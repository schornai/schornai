import { getAuthorizationUser } from "@/lib/platformMcp/getAuthorizationUser";
import { Footer } from "../../_components/Footer";
import { Suspense } from "react";
import { getT } from "next-i18next/server";
import { validateAuthorization } from "@/lib/platformMcp/validateAuthorization";
import { PlatformMcpConsent } from "./_components/PlatformMcpConsent";
async function Consent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { t } = await getT("me", { keyPrefix: "platformMcp" });
  let validated;
  try {
    validated = await validateAuthorization(await searchParams);
  } catch {
    return <p>{t("errorAuthorization")}</p>;
  }
  const { levels } = await getAuthorizationUser();
  return (
    <PlatformMcpConsent
      levels={levels}
      request={validated.input}
      clientName={validated.client.name}
    />
  );
}
export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <>
      <Suspense>
        <Consent {...props} />
      </Suspense>
      <Footer />
    </>
  );
}
