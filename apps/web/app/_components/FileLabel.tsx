"use client";

import type { ComponentProps } from "react";
import { useT } from "next-i18next/client";

export function FileLabel({
  path,
  ...props
}: { path: string } & Omit<ComponentProps<"span">, "children">) {
  const { t } = useT("fileNames");
  const fileName = path.split("/").pop();
  const fileExtension = fileName?.split(".").pop();

  return <span {...props}>{t(fileExtension ?? "unknown")}</span>;
}
