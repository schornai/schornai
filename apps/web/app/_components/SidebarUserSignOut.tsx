"use client";

import { DropdownMenuItem } from "@schornio/aibox-package-ui/components/dropdown-menu";
import { LockKeyhole } from "lucide-react";
import { signOut } from "../_actions/signOut";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";

export function SidebarUserSignOut() {
  const { t } = useT("common", {
    keyPrefix: "_components.SidebarUserSignOut",
  });

  const router = useRouter();

  const { executeAsync } = useAction(signOut);

  return (
    <DropdownMenuItem
      className="cursor-pointer"
      onClick={() => {
        void executeAsync().then(() => router.refresh());
      }}
    >
      <LockKeyhole /> {t("label")}
    </DropdownMenuItem>
  );
}
