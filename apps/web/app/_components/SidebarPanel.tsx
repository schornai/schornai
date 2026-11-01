"use client";

import { useDirection } from "@schornio/aibox-package-ui/components/direction";
import { Sidebar } from "@schornio/aibox-package-ui/components/sidebar";
import type { ReactNode } from "react";

export function SidebarPanel({ children }: { children?: ReactNode }) {
  const direction = useDirection();

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
