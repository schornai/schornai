import type { Preview } from "@storybook/nextjs-vite";
import { Collapsible } from "@schornio/aibox-package-ui/components/collapsible";
import { Tabs } from "@schornio/aibox-package-ui/components/tabs";
import { TabsMainListContext } from "../app/_components/TabsMain";
import { seedErrorLogs } from "./error-log-fixtures";
import { resetRealtimeDocument } from "./mocks/hocuspocus";
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
} from "@schornio/aibox-package-ui/components/message-scroller";
import { sb } from "storybook/test";
import { I18nProvider } from "next-i18next/client";
import i18next from "i18next";
import { ThemeProvider } from "next-themes";
import { CodeProvider } from "@schornio/aibox-package-ui/components/code";
import { SidebarProvider } from "@schornio/aibox-package-ui/components/sidebar";
import { TooltipProvider } from "@schornio/aibox-package-ui/components/tooltip";
import { configureContextFixtures } from "./context-fixtures";
import { configureServiceFixtures } from "./service-fixtures";
import { scenarioState, type Scenario } from "./scenario";
import "@schornio/aibox-package-ui/globals.css";
import {
  fallbackLanguage,
  languages,
  supportedLanguages,
} from "../lib/languages";
import { LanguageProvider } from "../app/_components/LanguageProvider";

sb.mock(import("../app/_components/FileUploadProvider.tsx"), { spy: true });
sb.mock(import("../app/(main)/_components/ActivityContextProvider.tsx"), {
  spy: true,
});
sb.mock(import("../app/(main)/activity/_components/ActivityListProvider.tsx"), {
  spy: true,
});
sb.mock(import("../app/(main)/agent/_components/AgentListProvider.tsx"), {
  spy: true,
});
sb.mock(import("../app/_components/StorageViewProvider.tsx"), { spy: true });
sb.mock(
  import("../app/(main)/agent/[agentId]/[activityId]/_components/ChatContext.tsx"),
  { spy: true },
);
sb.mock(
  import("../app/(main)/agent/[agentId]/[activityId]/_components/ChatComposeMessageContext.tsx"),
  { spy: true },
);
sb.mock(import("../app/_components/transcription/MediaPlayerContext.tsx"), {
  spy: true,
});
sb.mock(import("../app/(main)/agent/_components/AgentEditor.tsx"), {
  spy: true,
});
sb.mock(
  import("../app/(main)/app/documents/_components/DocumentRepositoryListProvider.tsx"),
  { spy: true },
);
sb.mock(
  import("../app/(main)/app/documents/[documentRepositoryId]/_components/DocumentRepositoryEditor.tsx"),
  { spy: true },
);
sb.mock(
  import("../app/(main)/app/transcribe/_components/TranscriberListProvider.tsx"),
  { spy: true },
);
sb.mock(
  import("../app/(main)/app/transcribe/[transcriberId]/_components/TranscriberEditor.tsx"),
  { spy: true },
);
sb.mock(
  import("../app/(settings)/_components/EditorAvatarUploadProvider.tsx"),
  { spy: true },
);
sb.mock(
  import("../app/(settings)/settings/user/_components/UserListProvider.tsx"),
  { spy: true },
);
sb.mock(
  import("../app/(settings)/settings/user/[userId]/_components/UserEditPermissionListProvider.tsx"),
  { spy: true },
);
sb.mock(
  import("../app/(settings)/settings/workspace/_components/WorkspaceListProvider.tsx"),
  { spy: true },
);
sb.mock(
  import("../app/(settings)/settings/workspace/[workspaceId]/_components/WorkspaceEditPermissionListProvider.tsx"),
  { spy: true },
);
sb.mock(
  import("../app/(settings)/settings/xrag/_components/XRAGUploadProvider.tsx"),
  { spy: true },
);
sb.mock(import("../app/feedback/_components/FeedbackContext.tsx"), {
  spy: true,
});

const translations = import.meta.glob("../app/i18n/locales/*/*.json", {
  eager: true,
  import: "default",
});
const resources: Record<string, Record<string, object>> = {};
for (const [path, value] of Object.entries(translations)) {
  const [, language, namespace] = path.match(/locales\/(.*?)\/(.*?)\.json$/)!;
  (resources[language!] ??= {})[namespace!] = value as object;
}
await i18next.init({
  lng: "de",
  fallbackLng: fallbackLanguage,
  resources,
  interpolation: { escapeValue: false },
});

const preview: Preview = {
  globalTypes: {
    locale: {
      toolbar: {
        icon: "globe",
        items: languages.map(({ code, name }) => ({
          value: code,
          title: name,
        })),
        dynamicTitle: true,
      },
    },
    theme: {
      toolbar: {
        icon: "circlehollow",
        items: ["light", "dark"],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { locale: "de", theme: "light" },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/agent/example", query: {} },
    },
    controls: { expanded: true },
    a11y: { manual: true, test: "todo" },
  },
  beforeEach(context) {
    const scenario = (context.parameters.scenario ?? "default") as Scenario;
    scenarioState.current = scenario;
    resetRealtimeDocument();
    seedErrorLogs(context.parameters.errorLogs);
    configureContextFixtures(scenario, context.parameters.contextFixtures);
    configureServiceFixtures(context.parameters.serviceFixtures);
    void i18next.changeLanguage(context.globals.locale);
  },
  decorators: [
    (Story, context) => (
      <I18nProvider
        language={context.globals.locale}
        resources={resources}
        fallbackLng={fallbackLanguage}
        supportedLngs={supportedLanguages}
      >
        <LanguageProvider>
          <ThemeProvider
            attribute="class"
            forcedTheme={context.globals.theme}
            enableSystem={false}
          >
            <CodeProvider>
              <TooltipProvider>
                <SidebarProvider>
                  <div className="bg-background text-foreground min-h-40 w-full p-6">
                    <MessageScrollerProvider>
                      <MessageScroller className="min-h-40">
                        <MessageScrollerViewport>
                          <MessageScrollerContent>
                            <Tabs defaultValue="example">
                              <TabsMainListContext>
                                <Collapsible>
                                  <Story />
                                </Collapsible>
                              </TabsMainListContext>
                            </Tabs>
                          </MessageScrollerContent>
                        </MessageScrollerViewport>
                      </MessageScroller>
                    </MessageScrollerProvider>
                  </div>
                </SidebarProvider>
              </TooltipProvider>
            </CodeProvider>
          </ThemeProvider>
        </LanguageProvider>
      </I18nProvider>
    ),
  ],
};
export default preview;
