import type { Activity } from "@schornio/aibox-realtime/documents/activity/_types";
import { ActivityStateText } from "./ActivityStateText";
import { Badge } from "@schornio/aibox-package-ui/components/badge";

export function ActivityStateBadge({ state }: { state: Activity["state"] }) {
  switch (state) {
    case "error":
      return (
        <Badge variant="destructive">
          <ActivityStateText state={state} />
        </Badge>
      );
    case "idle":
      return (
        <Badge className="bg-blue-500/10 text-blue-500 focus-visible:border-blue-500/40 focus-visible:ring-blue-500/20 dark:bg-blue-500/20 dark:focus-visible:ring-blue-500/40">
          <ActivityStateText state={state} />
        </Badge>
      );
    case "running":
      return (
        <Badge variant="outline">
          <ActivityStateText state={state} />
        </Badge>
      );
    case "success":
      return (
        <Badge className="bg-green-500/10 text-green-500 focus-visible:border-green-500/40 focus-visible:ring-green-500/20 dark:bg-green-500/20 dark:focus-visible:ring-green-500/40">
          <ActivityStateText state={state} />
        </Badge>
      );
  }
}
