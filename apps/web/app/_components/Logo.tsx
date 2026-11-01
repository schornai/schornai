import { LogoSchornAI } from "@schornio/aibox-package-ui/components/logo-schornai";
import { Skeleton } from "@schornio/aibox-package-ui/components/skeleton";
import { Suspense } from "react";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { getThemeLocalized } from "@/lib/themeLanguages";
import { getSystemConfigTheme } from "../_models/systemConfigTheme";
import { getT } from "next-i18next/server";

export function Logo({ className }: { className?: string }) {
  return (
    <Suspense fallback={<Skeleton className={className} />}>
      <LogoData className={className} />
    </Suspense>
  );
}

export async function LogoData({ className }: { className?: string }) {
  const [theme, { lng }] = await Promise.all([getSystemConfigTheme(), getT()]);
  const logo = getThemeLocalized(theme.logo, lng);

  if (logo) {
    return <img alt={logo.alt ?? ""} className={className} src={logo.url} />;
  }

  return <LogoSchornAI className={cn("text-muted-foreground", className)} />;
}
