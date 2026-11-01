import {
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@schornio/aibox-package-ui/components/field";
import { AvatarUser } from "@schornio/aibox-package-ui/components/avatar-user";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { EditorAvatarDelete } from "./EditorAvatarDelete";
import { EditorAvatarUpload } from "./EditorAvatarUpload";
import { EditorAvatarUploadProvider } from "./EditorAvatarUploadProvider";
import { getT } from "next-i18next/server";

export async function EditorAvatar(props: {
  avatarUrl?: string;
  hasOwnAvatar?: boolean;
  firstName?: string;
  lastName?: string;
  targetUserId?: string;
  userId: string;
}) {
  const { t } = await getT("me", { keyPrefix: "_components.EditorAvatar" });

  return (
    <EditorAvatarUploadProvider
      userId={props.userId}
      targetUserId={props.targetUserId}
    >
      <ContainerMain className="flex flex-col gap-3">
        <FieldGroup>
          <FieldSet>
            <FieldLegend>{t("titleAvatar")}</FieldLegend>
          </FieldSet>
          <div className="grid grid-cols-[auto_1fr] items-center justify-items-start gap-3">
            <AvatarUser
              avatarUrl={props.avatarUrl}
              firstName={props.firstName}
              lastName={props.lastName}
              size8XL
            />
            <div className="flex flex-col gap-3">
              <EditorAvatarUpload />
              {(props.hasOwnAvatar ?? Boolean(props.avatarUrl)) ? (
                <EditorAvatarDelete targetUserId={props.targetUserId} />
              ) : undefined}
            </div>
          </div>
        </FieldGroup>
      </ContainerMain>
    </EditorAvatarUploadProvider>
  );
}
