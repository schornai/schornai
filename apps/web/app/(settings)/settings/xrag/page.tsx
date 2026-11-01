"use client";

import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { PackageOpen } from "lucide-react";
import XRAGUpload from "./_components/XRAGUpload";
import XRAGUploadProvider from "./_components/XRAGUploadProvider";
import { useT } from "next-i18next/client";

export default function Page() {
  const { t } = useT("settings", { keyPrefix: "xrag.page" });

  return (
    <XRAGUploadProvider>
      <HeaderMain>
        <HeaderMainContent>
          <PackageOpen /> {t("labelTitle")}
        </HeaderMainContent>
      </HeaderMain>

      <XRAGUpload />
    </XRAGUploadProvider>
  );
}
