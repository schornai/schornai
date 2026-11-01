import { notFound } from "next/navigation";
import { getSystemConfigTheme } from "../../../_models/systemConfigTheme";
import { getWorkspaceClaims } from "../../../_models/getWorkspaceClaims";
import { getSystemConfigWelcomeMessage } from "../../../_models/systemConfigWelcomeMessage";
import { ThemeEditor } from "./_components/ThemeEditor";

import { getSystemConfigAccessMessage } from "../../../_models/systemConfigAccessMessage";

export default async function Page() {
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
