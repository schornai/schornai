"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectValue,
} from "@schornio/aibox-package-ui/components/select";
import { SelectTriggerAction } from "@schornio/aibox-package-ui/components/select-trigger-action";
import { UserRoleIcon } from "../../../../../_components/UserRoleIcon";
import { UserRoleText } from "../../../../../_components/UserRoleText";
import type { UserWithWorkspaceRole } from "./WorkspaceEditPermissionListProvider";
import { updatePermission } from "../../../_actions/updatePermission";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useState } from "react";

export function WorkspaceEditPermissionListTablePermissionCell({
  user,
  workspaceId,
}: {
  user: UserWithWorkspaceRole;
  workspaceId: string;
}) {
  const [role, setRole] = useState(user.workspaceRole ?? ("none" as const));

  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const { execute, isPending } = useAction(updatePermission, {
    ...actionUtils,
    onError: () => {
      actionUtils.onError();
      setRole(user.workspaceRole ?? ("none" as const));
    },
  });

  const items = [
    {
      label: (
        <>
          <UserRoleIcon role="none" /> <UserRoleText role="none" />
        </>
      ),
      value: "none",
    },
    {
      label: (
        <>
          <UserRoleIcon role="user" /> <UserRoleText role="user" />
        </>
      ),
      value: "user",
    },
    {
      label: (
        <>
          <UserRoleIcon role="editor" /> <UserRoleText role="editor" />
        </>
      ),
      value: "editor",
    },
    {
      label: (
        <>
          <UserRoleIcon role="workspace-admin" />{" "}
          <UserRoleText role="workspace-admin" />
        </>
      ),
      value: "workspace-admin",
    },
  ];

  return (
    <Select
      items={items}
      onValueChange={(value) => {
        if (value) {
          setRole(value);
          execute({ role: value, userId: user.id, workspaceId });
        }
      }}
      value={role}
    >
      <SelectTriggerAction
        className="w-full"
        hasErrored={hasErrored}
        hasSucceeded={hasSucceeded}
        isPending={isPending}
      >
        <SelectValue />
      </SelectTriggerAction>
      <SelectContent>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
