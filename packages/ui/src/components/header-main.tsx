"use client";

import type { ComponentProps, ReactNode } from "react";
import { SidebarTrigger } from "./sidebar.tsx";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { ContainerStyled } from "./container-styled.tsx";

export function HeaderMain({
  children,
  className,
  fit,
  ...otherProps
}: { fit?: boolean } & ComponentProps<typeof ContainerStyled>) {
  return (
    <div
      className={cn("@container sticky top-0 right-0 left-0 z-40 p-3", {
        "p-0": fit,
      })}
    >
      <ContainerStyled
        className={cn(
          className,
          "grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden @min-[640px]:grid-cols-3",
        )}
        variant="card"
        {...otherProps}
      >
        <SidebarTrigger />
        {children}
      </ContainerStyled>
    </div>
  );
}

export function HeaderMainContent({ children }: { children?: ReactNode }) {
  return (
    <h1 className="mx-auto flex items-center gap-2 text-lg font-bold @max-[640px]:block @max-[640px]:max-w-full @max-[640px]:min-w-0 @max-[640px]:truncate @max-[640px]:[&>svg]:mr-2 @max-[640px]:[&>svg]:inline-block @max-[640px]:[&>svg]:align-middle">
      {children}
    </h1>
  );
}

export function HeaderMainAsideContent({ children }: { children?: ReactNode }) {
  return (
    <div className="flex justify-end gap-2 @max-[640px]:items-center">
      {children}
    </div>
  );
}
