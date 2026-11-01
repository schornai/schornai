"use client";

import { useT } from "next-i18next/client";

export function UserRoleText({ role }: { role?: string }) {
  const { t } = useT("common", { keyPrefix: "_components.UserRoleText" });

  switch (role) {
    case "admin":
    case "editor":
    case "user":
    case "workspace-admin":
      return t(role);
    default:
      return t("none");
  }
}
