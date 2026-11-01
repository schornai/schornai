"use client";
import Link from "next/link";
import { useT } from "next-i18next/client";
import { ArrowRight } from "lucide-react";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { externalModelProviders, providers } from "../providers";
export function ProviderSelection() {
  const { t } = useT("settings", { keyPrefix: "models" });
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("labelChooseProvider")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("descriptionChooseProvider")}
        </p>
      </div>
      <ul className="flex w-full flex-col gap-2">
        {externalModelProviders.map((provider) => (
          <li key={provider}>
            <Button
              className="w-full justify-between"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/models/new/${provider}`} />}
            >
              {providers[provider].name}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
