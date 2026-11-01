import {
  FieldGroup,
  FieldSeparator,
} from "@schornio/aibox-package-ui/components/field";
import { AlreadySignedIn } from "./_components/AlreadySignedIn";
import { Footer } from "../_components/Footer";
import { MarkdownProse } from "@schornio/aibox-package-ui/components/markdown-prose";
import { PasswordSignIn } from "./_components/PasswordSignIn";
import { SSOSignIn } from "./_components/SSOSignIn";
import { getCurrentUserProfile } from "../_models/getCurrentUserProfile";
import { getEnvSafe } from "@schornio/aibox-package-utils/getEnvSafe";
import { getThemeLocalized } from "@/lib/themeLanguages";
import { getSSOProvider } from "@schornio/aibox-package-database/sso/getSSOProvider";
import { getSystemConfigSignIn } from "../_models/systemConfigSignIn";
import { getSystemConfigWelcomeMessage } from "../_models/systemConfigWelcomeMessage";
import { getT } from "next-i18next/server";
import { tryAsync } from "@schornio/aibox-package-utils/tryAsync";

// Sign-in waits for the current session and configured authentication methods.
export const instant = false;

export default async function Page(params: PageProps<"/signin">) {
  const [
    currentUserProfile,
    searchParams,
    signInConfig,
    welcomeMessage,
    { lng, t },
  ] = await Promise.all([
    getCurrentUserProfile(),
    params.searchParams,
    getSystemConfigSignIn(),
    getSystemConfigWelcomeMessage(),
    getT(),
  ]);

  const passwordSignInVisible =
    searchParams.method === "password" || signInConfig.password === "visible";
  const ssoSignInVisibleFromConfig =
    searchParams.method === "sso" || signInConfig.sso === "visible";

  const ssoProvider = ssoSignInVisibleFromConfig
    ? (
        await tryAsync(() =>
          getSSOProvider({
            supabaseServiceRoleConfig: {
              supabaseServiceRoleKey: getEnvSafe("SUPABASE_SERVICE_ROLE_KEY"),
              supabaseUrl: getEnvSafe("SUPABASE_URL"),
            },
          }),
        )
      ).data
    : undefined;

  const ssoSignInVisible = Boolean(ssoProvider);

  return (
    <>
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-2">
        <div className="bg-primary text-primary-foreground flex items-center justify-center">
          <div className="max-w-lg p-3">
            <MarkdownProse className="prose-invert">
              {getThemeLocalized(welcomeMessage, lng) ?? t("_welcomeMessage")}
            </MarkdownProse>
          </div>
        </div>
        <div className="flex flex-col justify-center py-10">
          {currentUserProfile ? (
            <AlreadySignedIn user={currentUserProfile} />
          ) : (
            <FieldGroup>
              {passwordSignInVisible ? <PasswordSignIn /> : undefined}

              {passwordSignInVisible && ssoSignInVisible ? (
                <FieldSeparator />
              ) : undefined}

              {ssoSignInVisible && ssoProvider ? (
                <SSOSignIn
                  providerId={ssoProvider.id}
                  providerName={signInConfig.ssoName}
                />
              ) : undefined}
            </FieldGroup>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
