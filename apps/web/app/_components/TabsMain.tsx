"use client";

import type { ComponentProps, ReactNode } from "react";
import { createContext, useContext } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { useRouter } from "next/navigation";

const tabsMainListContext = createContext({ searchParamView: "view" });

/**
 * Just use it if you want to change the default search param
 */
export function TabsMainListContext({
  children,
  searchParamView = "view",
}: {
  children?: ReactNode;
  searchParamView?: string;
}) {
  return (
    <tabsMainListContext.Provider value={{ searchParamView }}>
      {children}
    </tabsMainListContext.Provider>
  );
}

export function TabsMainList({
  children,
  className,
  stickyTop,
}: {
  children?: ReactNode;
  className?: string;
  stickyTop?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto h-8.5 w-full scrollbar-none overflow-x-scroll",
        {
          "sticky top-22 z-40": stickyTop,
        },
        className,
      )}
    >
      <ContainerStyled
        className="bg-muted/60 absolute inset-0 inset-x-3 mx-auto flex w-fit gap-0.5 rounded-lg p-0.5"
        variant="card"
      >
        {children}
      </ContainerStyled>
    </div>
  );
}

export function TabsMainTriggerBase({
  className,
  isCurrentView,
  ...props
}: { isCurrentView?: boolean } & ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn({ "text-muted-foreground": !isCurrentView }, className)}
      size="sm"
      variant={isCurrentView ? "outline" : "ghost"}
      {...props}
    />
  );
}

export function TabsMainTrigger({
  children,
  className,
  view,
}: {
  children?: ReactNode;
  className?: string;
  view: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const context = useContext(tabsMainListContext);

  const currentView = searchParams.get(context.searchParamView) ?? "default";
  const isCurrentView = view === currentView;

  return (
    <TabsMainTriggerBase
      className={className}
      isCurrentView={isCurrentView}
      onClick={() => {
        if (view === "default") {
          router.push(pathname);
        } else {
          router.push(`${pathname}?${context.searchParamView}=${view}`);
        }
      }}
    >
      {children}
    </TabsMainTriggerBase>
  );
}

export function TabsMainContent({
  children,
  view,
}: {
  children?: ReactNode;
  view: string;
}) {
  const searchParams = useSearchParams();
  const context = useContext(tabsMainListContext);

  const currentView = searchParams.get(context.searchParamView) ?? "default";
  const isCurrentView = view === currentView;

  if (isCurrentView) {
    return children;
  }

  return undefined;
}
