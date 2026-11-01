"use client";

import type { ReactElement, ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@schornio/aibox-package-ui/components/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@schornio/aibox-package-ui/components/dropdown-menu";

const menuClassName =
  "w-max max-w-[calc(100vw-2rem)] whitespace-nowrap **:data-[variant=destructive]:text-destructive! **:data-[variant=destructive]:**:text-destructive! **:data-[variant=destructive]:focus:bg-destructive/10!";

/** Both shadcn menus use Base UI Menu items, so actions and submenus are shared. */
export function StorageActionMenu({
  trigger,
  items,
  children,
}: {
  trigger?: ReactElement;
  items: ReactNode;
  children?: (dropdown: ReactNode) => ReactElement;
}) {
  const dropdown = trigger ? (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="end" className={menuClassName}>
        {items}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  if (!children) return dropdown;
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={children(dropdown)}
        onContextMenu={(event) => event.stopPropagation()}
      />
      <ContextMenuContent className={menuClassName}>{items}</ContextMenuContent>
    </ContextMenu>
  );
}
