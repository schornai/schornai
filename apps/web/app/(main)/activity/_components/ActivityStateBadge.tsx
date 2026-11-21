import type { Activity } from "@schornio/aibox-realtime/documents/activity/_types";
import { ActivityStateText } from "./ActivityStateText";
import { StatusBadge } from "../../../_components/StatusBadge";

export function ActivityStateBadge({ state }: { state: Activity["state"] }) {
  return (
    <StatusBadge state={state}>
      <ActivityStateText state={state} />
    </StatusBadge>
  );
}
