import { Suspense } from "react";
import { Skeleton } from "@schornio/aibox-package-ui/components/skeleton";
import { notFound } from "next/navigation";
import { getSystemConfigTheme } from "../../../_models/systemConfigTheme";
import { getWorkspaceClaims } from "../../../_models/getWorkspaceClaims";
import { getSystemConfigWelcomeMessage } from "../../../_models/systemConfigWelcomeMessage";
import { ThemeEditor } from "./_components/ThemeEditor";

import { getSystemConfigAccessMessage } from "../../../_models/systemConfigAccessMessage";

async function ThemeSettings() {
  const { isAdmin } = await getWorkspaceClaims();
  if (!isAdmin) notFound();

  const [theme, welcomeMessage, accessMessage] = await Promise.all([
    getSystemConfigTheme(),
    getSystemConfigWelcomeMessage(),
    getSystemConfigAccessMessage(),
  ]);

  return (
    <ThemeEditor
      defaultTheme={theme}
      defaultAccessMessage={accessMessage}
      defaultWelcomeMessage={welcomeMessage}
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="m-6 h-64" />}>
      <ThemeSettings />
    </Suspense>
  );
}
