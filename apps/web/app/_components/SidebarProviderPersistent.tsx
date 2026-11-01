import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { SidebarProvider } from "@schornio/aibox-package-ui/components/sidebar";

export async function SidebarProviderPersistent({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>{children}</SidebarProvider>
  );
}
