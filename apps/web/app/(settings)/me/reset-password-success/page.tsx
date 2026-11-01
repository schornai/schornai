import { Button } from "@schornio/aibox-package-ui/components/button";
import Link from "next/link";
import { getT } from "next-i18next/server";

export default async function Page() {
   const { t } = await getT("me", { keyPrefix: "resetPasswordSuccess.page" });

   return (
       <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 p-5">
          <h2 className="text-2xl font-bold">{t("title")}</h2>

          <p>{t("description")}</p>

          <Button nativeButton={false} render={<Link href="/" />}>
           {t("buttonBackToDashboard")}
          </Button>
        </div>
      );
}
