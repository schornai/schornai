import {
  SidebarContent,
  SidebarHeader,
} from "@schornio/aibox-package-ui/components/sidebar";
import Link from "next/link";
import { Logo } from "../_components/Logo";
import type { ReactNode } from "react";
import { SidebarFooter } from "./SidebarFooter";
import { Suspense } from "react";
import { SidebarPanel } from "./SidebarPanel";

export function Sidebar({ children }: { children?: ReactNode }) {
  return (
    <SidebarPanel>
      <SidebarHeader className="flex items-center justify-center group-data-[collapsible=icon]:hidden">
        <Link href="/">
          <Logo className="max-h-20 w-32 object-contain" />
        </Link>
      </SidebarHeader>
      <SidebarContent className="scroll-fade">{children}</SidebarContent>
      <Suspense>
        <SidebarFooter />
      </Suspense>
    </SidebarPanel>
  );
}
