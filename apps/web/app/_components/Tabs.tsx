"use client";

import type { ComponentProps, ReactNode } from "react";
import { Tabs, TabsList } from "@schornio/aibox-package-ui/components/tabs";
import { usePathname, useSearchParams } from "next/navigation";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { useRouter } from "next/navigation";

export function TabsSub({
  className,
  searchParamsKey,
  ...props
}: { searchParamsKey: string } & ComponentProps<typeof Tabs>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const view = searchParams.get(searchParamsKey);

  return (
    <Tabs
      className={cn("max-w-[100vw]", className)}
      onValueChange={(view) => {
        const params = new URLSearchParams(searchParams);
        if (view === "default") {
          params.delete(searchParamsKey);
        } else {
          params.set(searchParamsKey, String(view));
        }
        if (params.size === 0) {
          router.push(pathname, { scroll: false });
        } else {
          router.push(`${pathname}?${params}`, { scroll: false });
        }
      }}
      value={view ?? "default"}
      {...props}
    />
  );
}

export function TabsSubList({
  children,
  variant = "line",
}: {
  children?: ReactNode;
  variant?: ComponentProps<typeof TabsList>["variant"];
}) {
  return (
    <ContainerMain className="no-scrollbar px-3 max-md:overflow-x-scroll max-md:overflow-y-hidden">
      <TabsList className="h-fit! md:flex-wrap" variant={variant}>
        {children}
      </TabsList>
    </ContainerMain>
  );
}
