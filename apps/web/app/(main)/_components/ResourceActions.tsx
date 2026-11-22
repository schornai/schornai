"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import {
  DropdownMenuItem,
  DropdownMenuGroup,
} from "@schornio/aibox-package-ui/components/dropdown-menu";
import { DropdownMenuItemAction } from "@schornio/aibox-package-ui/components/dropdown-menu-item-action";
import {
  IconGroup,
  IconGroupButton,
  IconGroupButtonAction,
} from "@schornio/aibox-package-ui/components/icon-group";
import { Star, StarX } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { updateFavorite } from "../_actions/updateFavorite";
import type { SettingFavorites } from "../../_models/currentUserConfigFavorites";

export type ResourceActionDisplay = "icons" | "menu" | "buttons";

export function ResourceActions({
  display,
  primary,
  favorite,
  info,
  edit,
  packageActions,
  remove,
}: {
  display: ResourceActionDisplay;
  primary?: ReactNode;
  favorite: ReactNode;
  info: ReactNode;
  edit?: ReactNode;
  packageActions?: ReactNode;
  remove?: ReactNode;
}) {
  if (display === "icons")
    return (
      <IconGroup>
        {edit}
        {info}
        {favorite}
        {primary}
      </IconGroup>
    );
  if (display === "menu")
    return (
      <DropdownMenuGroup>
        {primary}
        {favorite}
        {info}
        {edit}
      </DropdownMenuGroup>
    );
  return (
    <div className="flex flex-col gap-2">
      {primary}
      {favorite}
      {packageActions}
      {edit}
      {remove}
    </div>
  );
}

export function ResourceActionButton({
  display,
  label,
  children,
  disabled,
  onClick,
  href,
}: {
  display: ResourceActionDisplay;
  label: string;
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const link = href ? <Link href={href} /> : undefined;
  const props = { disabled, onClick, render: link };
  if (display === "icons")
    return (
      <IconGroupButton nativeButton={!link} tooltip={label} {...props}>
        {children}
      </IconGroupButton>
    );
  if (display === "menu")
    return (
      <DropdownMenuItem {...props}>
        {children}
        {label}
      </DropdownMenuItem>
    );
  return (
    <Button nativeButton={!link} variant="outline" {...props}>
      {children}
      {label}
    </Button>
  );
}

export function ResourceFavorite({
  display = "icons",
  id,
  type,
  favorites,
  addLabel,
  removeLabel,
}: {
  display?: ResourceActionDisplay;
  id?: string;
  type: SettingFavorites["favorites"][number]["type"];
  favorites?: SettingFavorites;
  addLabel: string;
  removeLabel: string;
}) {
  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const { execute, isPending } = useAction(updateFavorite, actionUtils);
  const entries = favorites?.favorites ?? [];
  const matches = (entry: SettingFavorites["favorites"][number]) =>
    entry.id === id && entry.type === type;
  const selected = entries.some(matches);
  const label = selected ? removeLabel : addLabel;
  const icon = selected ? <StarX /> : <Star />;
  const props = {
    disabled: !id,
    hasErrored,
    hasSucceeded,
    isPending,
    onClick: () => {
      if (id)
        execute({
          version: "favorites-v2",
          showInSidebar: favorites?.showInSidebar ?? false,
          favorites: selected
            ? entries.filter((entry) => !matches(entry))
            : [...entries, { id, type }],
        });
    },
  };
  if (display === "icons")
    return (
      <IconGroupButtonAction tooltip={label} indicator="replace" {...props}>
        {icon}
      </IconGroupButtonAction>
    );
  if (display === "menu")
    return (
      <DropdownMenuItemAction closeOnClick={false} {...props}>
        {icon}
        {label}
      </DropdownMenuItemAction>
    );
  return (
    <ButtonAction variant="outline" {...props}>
      {icon}
      {label}
    </ButtonAction>
  );
}
