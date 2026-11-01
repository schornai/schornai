"use client";

import { TabsContent } from "@schornio/aibox-package-ui/components/tabs";
import type { AccessMessageTemplates } from "@/lib/accessMessage";
import { ThemeWelcomeEditor } from "./ThemeWelcomeEditor";
import { ThemeAccessMessageEditor } from "./ThemeAccessMessageEditor";

export function ThemeTextTab({
  welcomeMessage,
  onWelcomeMessageChange,
  accessMessage,
  onAccessMessageChange,
  disabled,
}: {
  welcomeMessage: Record<string, string>;
  onWelcomeMessageChange: (value: Record<string, string>) => void;
  accessMessage: AccessMessageTemplates;
  onAccessMessageChange: (value: AccessMessageTemplates) => void;
  disabled: boolean;
}) {
  return (
    <TabsContent value="texts" keepMounted>
      <ThemeWelcomeEditor
        localized={welcomeMessage}
        onChange={onWelcomeMessageChange}
        disabled={disabled}
      />
      <hr className="my-10" />
      <ThemeAccessMessageEditor
        localized={accessMessage}
        onChange={onAccessMessageChange}
        disabled={disabled}
      />
    </TabsContent>
  );
}
