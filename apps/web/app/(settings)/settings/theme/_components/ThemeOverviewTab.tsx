"use client";

import type { ComponentProps } from "react";
import { TabsContent } from "@schornio/aibox-package-ui/components/tabs";
import { ThemeOverview } from "./ThemeOverview";

export function ThemeOverviewTab(props: ComponentProps<typeof ThemeOverview>) {
  return (
    <TabsContent value="default">
      <ThemeOverview {...props} />
    </TabsContent>
  );
}
