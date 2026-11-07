"use client";

import { useId, useRef, useState } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";
import { useSortable } from "@dnd-kit/react/sortable";
import { Grip, StarX } from "lucide-react";
import { useT } from "next-i18next/client";
import { useAction } from "next-safe-action/hooks";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import { AvatarApp } from "@schornio/aibox-package-ui/components/avatar-app";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { Switch } from "@schornio/aibox-package-ui/components/switch";
import {
  Field,
  FieldLabel,
  FieldError,
} from "@schornio/aibox-package-ui/components/field";
import type { SettingFavorites } from "@schornio/aibox-package-database/config/favoritesSchema";
import { updateFavorite } from "../../../../(main)/_actions/updateFavorite";

type FavoriteAppearance = Pick<Agent, "name"> &
  Partial<Pick<Agent, "color" | "icon">>;

function FavoriteRow({
  id,
  index,
  name,
  appearance,
  type,
  disabled,
  onRemove,
}: {
  id: string;
  index: number;
  name: string;
  appearance?: FavoriteAppearance;
  type: SettingFavorites["favorites"][number]["type"];
  disabled: boolean;
  onRemove: () => void;
}) {
  const { t } = useT("me", { keyPrefix: "favorites" });
  const [element, setElement] = useState<Element | null>(null);
  const handle = useRef<HTMLButtonElement | null>(null);
  useSortable({ id, index, element, handle, disabled });
  return (
    <ContainerStyled
      ref={setElement}
      appColor={appearance?.color}
      className="flex items-center gap-3 rounded-md p-3"
    >
      <Button
        ref={handle}
        disabled={disabled}
        className="cursor-grab"
        size="icon-sm"
        variant="ghost"
        aria-label={t("labelMove", { name })}
      >
        <Grip />
      </Button>
      <AvatarApp
        fallback={name}
        icon={
          appearance?.icon ?? {
            type: "icon-lucide",
            iconName: {
              agent: "bot-message-square",
              workspace: "library",
              transcriber: "audio-lines",
              documentRepository: "folder-open",
            }[type],
          }
        }
      />
      <div className="min-w-0 flex-1">
        <div className="truncate">{name}</div>
        <div className="text-muted-foreground text-sm">
          {t(`types.${type}`)}
        </div>
      </div>
      <Button
        disabled={disabled}
        size="icon-sm"
        variant="ghost"
        aria-label={t("labelRemoveNamed", { name })}
        onClick={onRemove}
      >
        <StarX />
      </Button>
    </ContainerStyled>
  );
}

export function FavoritesEditor({
  config,
  appearances,
}: {
  config: SettingFavorites;
  appearances: Record<string, FavoriteAppearance>;
}) {
  const { t } = useT("me", { keyPrefix: "favorites" });
  // Editable draft: persisted together when the user saves, like recommended messages.
  const switchId = useId();
  const [showInSidebar, setShowInSidebar] = useState(config.showInSidebar);
  const [favorites, setFavorites] = useState(config.favorites);
  const action = useAction(updateFavorite);
  const dirty =
    showInSidebar !== config.showInSidebar ||
    JSON.stringify(favorites) !== JSON.stringify(config.favorites);
  const nameFor = (key: string) =>
    appearances[key]?.name || t("labelUnavailable");
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground">{t("description")}</p>
      <Field orientation="horizontal">
        <Switch
          id={switchId}
          checked={showInSidebar}
          onCheckedChange={setShowInSidebar}
          disabled={action.isPending}
        />
        <FieldLabel htmlFor={switchId}>{t("labelShowInSidebar")}</FieldLabel>
      </Field>
      {!favorites.length && <p>{t("labelEmpty")}</p>}
      <DragDropProvider
        onDragEnd={(event) => {
          if (!event.canceled && !action.isPending)
            setFavorites((items) =>
              move(
                items.map((item) => ({
                  ...item,
                  id: `${item.type}:${item.id}`,
                  favoriteId: item.id,
                })),
                event,
              ).map(({ favoriteId, type }) => ({ id: favoriteId, type })),
            );
        }}
      >
        {favorites.map((favorite, index) => {
          const key = `${favorite.type}:${favorite.id}`;
          return (
            <FavoriteRow
              key={key}
              id={key}
              index={index}
              name={nameFor(key)}
              appearance={appearances[key]}
              type={favorite.type}
              disabled={action.isPending}
              onRemove={() =>
                setFavorites((items) =>
                  items.filter((item) => `${item.type}:${item.id}` !== key),
                )
              }
            />
          );
        })}
      </DragDropProvider>
      {action.hasErrored && <FieldError>{t("errorSave")}</FieldError>}
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          disabled={!dirty || action.isPending}
          onClick={() => {
            setFavorites(config.favorites);
            setShowInSidebar(config.showInSidebar);
            action.reset();
          }}
        >
          {t("labelReset")}
        </Button>
        <ButtonAction
          disabled={!dirty}
          isPending={action.isPending}
          hasErrored={action.hasErrored}
          hasSucceeded={action.hasSucceeded}
          onClick={() =>
            action.execute({ ...config, favorites, showInSidebar })
          }
        >
          {t("labelSave")}
        </ButtonAction>
      </div>
    </div>
  );
}
