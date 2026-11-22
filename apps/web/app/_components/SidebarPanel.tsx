"use client";

import { useDirection } from "@schornio/aibox-package-ui/components/direction";
import {
  Sidebar,
  useSidebar,
} from "@schornio/aibox-package-ui/components/sidebar";
import { useEffect, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function SidebarPanel({ children }: { children?: ReactNode }) {
  const direction = useDirection();
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const { setOpenMobile } = useSidebar();

  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, query, setOpenMobile]);

  return (
    <Sidebar
      collapsible="icon"
      dir={direction}
      side={direction === "rtl" ? "right" : "left"}
      className="rtl:group-data-[side=right]:border-s-0 rtl:group-data-[side=right]:border-e"
    >
      {children}
    </Sidebar>
  );
}
