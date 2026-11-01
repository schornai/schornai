"use client";
import Link from "next/link";
import { useT } from "next-i18next/client";
import { ArrowRight } from "lucide-react";
import { Button } from "@schornio/aibox-package-ui/components/button";
export function ConnectionTypeSelection() {
  const { t } = useT("settings", { keyPrefix: "connections" });
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <p className="text-muted-foreground">{t("descriptionChooseType")}</p>
      <ul className="flex flex-col gap-2">
        {(["oauth", "brave", "staan"] as const).map((kind) => (
          <li key={kind}>
            <Button
              className="w-full justify-between"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/settings/connections/new/${kind}`} />}
            >
              {t(`labelType_${kind}`)}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
