import "@schornio/aibox-package-ui/globals.css";

import { CodeProvider } from "@schornio/aibox-package-ui/components/code";
import { I18nProvider } from "./_components/I18nProvider";
import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { ThemeProvider } from "./_components/ThemeProvider";
import { TooltipProvider } from "@schornio/aibox-package-ui/components/tooltip";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import i18nConfig from "../i18n.config";
import { getT, initServerI18next } from "next-i18next/server";
import { getLanguageDirection } from "../lib/languages";

initServerI18next(i18nConfig);

const montserrat = Montserrat({ subsets: ["latin"] });

export const instant = false;

export const metadata: Metadata = {
  appleWebApp: true,
  description: "schorn.ai App",
  icons: {
    apple: "/brand/squared.png",
    icon: "/brand/squared.png",
  },
  title: "schorn.ai App",
};

export default async function RootLayout(props: LayoutProps<"/">) {
  const { lng } = await getT();
  return (
    <html lang={lng} dir={getLanguageDirection(lng)} suppressHydrationWarning>
      <body className={cn(montserrat.className, "antialiased")}>
        <ThemeProvider>
          <I18nProvider>
            <TooltipProvider>
              <CodeProvider>
                <div className="flex min-h-svh flex-col">{props.children}</div>
              </CodeProvider>
            </TooltipProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
