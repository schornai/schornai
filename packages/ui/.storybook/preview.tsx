import type { Preview } from "@storybook/react-vite";
import { ThemeProvider } from "next-themes";
import { CodeProvider } from "../src/components/code";
import { TooltipProvider } from "../src/components/tooltip";
import { SidebarProvider } from "../src/components/sidebar";
import "../src/styles/globals.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      toolbar: {
        icon: "circlehollow",
        items: ["light", "dark"],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light" },
  parameters: {
    controls: { expanded: true },
    a11y: { manual: true, test: "todo" },
  },
  decorators: [
    (Story, context) => (
      <ThemeProvider
        attribute="class"
        forcedTheme={context.globals.theme}
        enableSystem={false}
      >
        <CodeProvider>
          <TooltipProvider>
            <SidebarProvider>
              <div className="bg-background text-foreground min-h-40 w-full p-6">
                <Story />
              </div>
            </SidebarProvider>
          </TooltipProvider>
        </CodeProvider>
      </ThemeProvider>
    ),
  ],
};
export default preview;
