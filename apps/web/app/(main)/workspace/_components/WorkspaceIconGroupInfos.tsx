import {
  IconGroup,
  IconGroupInfo,
} from "@schornio/aibox-package-ui/components/icon-group";
import { UserRoleIcon } from "../../../_components/UserRoleIcon";
import { UserRoleText } from "../../../_components/UserRoleText";
import type { WorkspaceClaim } from "../../../_models/getWorkspaceClaims";

export function WorkspaceIconGroupInfos({
  workspace,
}: {
  workspace?: WorkspaceClaim;
}) {
  return (
    <IconGroup>
      <IconGroupInfo tooltip={<UserRoleText role={workspace?.claim} />}>
        <UserRoleIcon role={workspace?.claim} />
      </IconGroupInfo>
    </IconGroup>
  );
}
