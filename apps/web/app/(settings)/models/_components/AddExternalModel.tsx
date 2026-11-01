"use client";
import Link from "next/link";
import { useT } from "next-i18next/client";
import { Plus } from "lucide-react";
import { Button } from "@schornio/aibox-package-ui/components/button";
export function AddExternalModel() {
  const { t } = useT("settings", { keyPrefix: "models" });
  return (
    <Button
      variant="outline"
      nativeButton={false}
      render={<Link href="/models/new" />}
    >
      <Plus data-icon="inline-start" />
      {t("labelAdd")}
    </Button>
  );
}
