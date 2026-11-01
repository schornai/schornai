"use client";

import { DirectionProvider } from "@schornio/aibox-package-ui/components/direction";
import { useT } from "next-i18next/client";
import { useEffect, type ReactNode } from "react";
import { getLanguageDirection } from "../../lib/languages";

export function LanguageProvider({ children }: { children?: ReactNode }) {
  const { i18n } = useT();
  const language = i18n.language;
  const direction = getLanguageDirection(language);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
  }, [language, direction]);

  return (
    <DirectionProvider direction={direction}>{children}</DirectionProvider>
  );
}
