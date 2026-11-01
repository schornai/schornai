"use client";

import {
  IconGroup,
  IconGroupButtonAction,
} from "@schornio/aibox-package-ui/components/icon-group";
import { Pin, PinOff, X } from "lucide-react";
import type { Activity } from "@schornio/aibox-realtime/documents/activity/_types";
import { deleteActivity } from "../../_actions/deleteActivity";
import { pinActivity } from "../../_actions/pinActivity";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useT } from "next-i18next/client";

export function ActivityIconGroupActions({ activity }: { activity: Activity }) {
  const { t } = useT("activity", {
    keyPrefix: "_components.ActivityIconGroupActions",
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

  return (
    <IconGroup>
      <IconGroupButtonAction
        indicator="replace"
        isPending={pinActivityIsPending}
        hasErrored={pinActivityHasErrored}
        hasSucceeded={pinActivityHasSucceeded}
        onClick={() =>
          pinActivityExecute({
            activityId: activity.id,
            pinned: !activity.pinned,
          })
        }
        tooltip={activity.pinned ? t("actionUnpin") : t("actionPin")}
      >
        {activity.pinned ? <PinOff /> : <Pin />}
      </IconGroupButtonAction>
      <IconGroupButtonAction
        indicator="replace"
        isPending={deleteActivityIsPending}
        hasErrored={deleteActivityHasErrored}
        hasSucceeded={deleteActivityHasSucceeded}
        onClick={() =>
          deleteActivityExecute({
            activityId: activity.id,
          })
        }
        tooltip={t("actionDelete")}
        variant="destructive"
      >
        <X />
      </IconGroupButtonAction>
    </IconGroup>
  );
}
