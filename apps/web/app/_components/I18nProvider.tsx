import { getResources, getT } from "next-i18next/server";
import { I18nProvider as I18nProviderCore } from "next-i18next/client";
import type { ReactNode } from "react";
import { fallbackLanguage, supportedLanguages } from "../../lib/languages";
import { LanguageProvider } from "./LanguageProvider";

export async function I18nProvider(props: { children?: ReactNode }) {
  const { i18n, lng } = await getT();
  const resources = getResources(i18n, undefined, [lng, fallbackLanguage]);

  return (
    <I18nProviderCore
      language={lng}
      resources={resources}
      fallbackLng={fallbackLanguage}
      supportedLngs={supportedLanguages}
    >
      <LanguageProvider>{props.children}</LanguageProvider>
    </I18nProviderCore>
  );
}
