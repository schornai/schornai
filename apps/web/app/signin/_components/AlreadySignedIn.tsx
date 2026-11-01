import { AvatarUser } from "@schornio/aibox-package-ui/components/avatar-user";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { Field } from "@schornio/aibox-package-ui/components/field";
import Link from "next/link";
import { SignOutButton } from "../../_components/SignOutButton";
import type { User } from "@schornio/aibox-package-database/user/_types";
import { getT } from "next-i18next/server";

export async function AlreadySignedIn({ user }: { user: User }) {
  const { t } = await getT("signIn", {
    keyPrefix: "_components.AlreadySignedIn",
  });

  const currentUserName =
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();

  return (
    <div className="mx-auto w-full max-w-sm p-3">
      <AvatarUser
        avatarUrl={user.avatarUrl}
        className="mx-auto mb-10"
        firstName={user.firstName}
        lastName={user.lastName}
        size8XL
      />
      <div className="prose dark:prose-invert text-center">
        <h2>{currentUserName.length > 0 ? currentUserName : user.email}</h2>
        <p>{t("info")}</p>
      </div>
      <Field className="mt-10">
        <Button
          nativeButton={false}
          render={<Link href="/">{t("backToDashboard")}</Link>}
        />
        <SignOutButton variant="outline">{t("signOut")}</SignOutButton>
      </Field>
    </div>
  );
}
