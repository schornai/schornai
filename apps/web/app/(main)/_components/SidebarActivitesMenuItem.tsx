"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@schornio/aibox-package-ui/components/dropdown-menu";
import {
  Ellipsis,
  Info,
  LoaderCircle,
  MessageSquarePlus,
  Pin,
  PinOff,
  X,
} from "lucide-react";
import type { Activity } from "@schornio/aibox-realtime/documents/activity/_types";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import { DropdownMenuItemAction } from "@schornio/aibox-package-ui/components/dropdown-menu-item-action";
import Link from "next/link";
import { SidebarMenuSubItem } from "@schornio/aibox-package-ui/components/sidebar";
import { deleteActivity } from "../_actions/deleteActivity";
import { getTypeId } from "../_utils/getTypeId";
import { getTypeLink } from "../_utils/getTypeLink";
import { pinActivity } from "../_actions/pinActivity";
import { useAction } from "next-safe-action/hooks";
import { useActivityTypeInfos } from "./ActivityContextProvider";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";

export function SidebarActivitesMenuItem({ activity }: { activity: Activity }) {
  const router = useRouter();
  const typeInfos = useActivityTypeInfos();
  const { t } = useT("activity", {
    keyPrefix: "_components.SidebarActivitesMenuItem",
  });

  const {
    actionUtils: pinActivityActionUtils,
    hasErrored: pinActivityHasErrored,
    hasSucceeded: pinActivityHasSucceeded,
  } = useDecayActionState();
  const { execute: pinActivityExecute, isPending: pinActivityIsPending } =
    useAction(pinActivity, pinActivityActionUtils);

  const {
    actionUtils: deleteActivityActionUtils,
    hasErrored: deleteActivityHasErrored,
    hasSucceeded: deleteActivityHasSucceeded,
  } = useDecayActionState();
  const { execute: deleteActivityExecute, isPending: deleteActivityIsPending } =
    useAction(deleteActivity, deleteActivityActionUtils);

  const typeId = getTypeId(activity.content);

  return (
    <SidebarMenuSubItem>
      <ContainerStyled
        appColor={typeInfos.get(typeId)?.color}
        className="flex cursor-pointer items-center rounded-sm p-0.5 ps-2"
        interactive
      >
        <Link
          className="h-full w-full truncate text-xs"
          href={
            activity.content?.type === "transcription"
              ? `${getTypeLink(activity.content)}/${activity.id}/files`
              : `${getTypeLink(activity.content)}/${activity.id}`
          }
        >
          {activity.state === "running" ? (
            <LoaderCircle className="me-1 inline size-3 animate-spin" />
          ) : undefined}
          {activity.label}&nbsp;
        </Link>
        <DropdownMenu>
          <Button
            render={<DropdownMenuTrigger />}
            size="icon-xs"
            variant="ghost"
          >
            <Ellipsis />
          </Button>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t("labelActivity")}</DropdownMenuLabel>
              <DropdownMenuItemAction
                isPending={pinActivityIsPending}
                hasErrored={pinActivityHasErrored}
                hasSucceeded={pinActivityHasSucceeded}
                onClick={() =>
                  pinActivityExecute({
                    activityId: activity.id,
                    pinned: !activity.pinned,
                  })
                }
              >
                {activity.pinned ? <PinOff /> : <Pin />}
                {t(activity.pinned ? "actionUnpin" : "actionPin")}
              </DropdownMenuItemAction>
              <DropdownMenuItemAction
                isPending={deleteActivityIsPending}
                hasErrored={deleteActivityHasErrored}
                hasSucceeded={deleteActivityHasSucceeded}
                onClick={() =>
                  deleteActivityExecute({
                    activityId: activity.id,
                  })
                }
              >
                <X /> {t("actionDelete")}
              </DropdownMenuItemAction>
              {activity.content?.type === "chat" ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>
                    {t("labelAgent", {
                      name: typeInfos.get(typeId)?.name,
                    })}
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(`/agent/${typeId}/${crypto.randomUUID()}`)
                    }
                  >
                    <MessageSquarePlus />
                    {t("actionNewChat")}
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href={`/agent/${typeId}`} />}>
                    <Info />
                    {t("labelInfo")}
                  </DropdownMenuItem>
                </>
              ) : undefined}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </ContainerStyled>
    </SidebarMenuSubItem>
  );
}
