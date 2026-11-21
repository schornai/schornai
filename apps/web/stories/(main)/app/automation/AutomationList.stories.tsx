import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AutomationList } from "../../../../app/(main)/app/automation/_components/AutomationList";
import { AutomationListProvider } from "../../../../app/(main)/app/automation/_components/AutomationListProvider";
import { AutomationListOptionsDropdown } from "../../../../app/(main)/app/automation/_components/AutomationListOptionsDropdown";
import {
  HeaderMain,
  HeaderMainContent,
  HeaderMainAsideContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { savedAutomation } from "./fixtures";
const meta = {
  title: "Web/(main)/app/automation/AutomationList",
  component: AutomationList,
  decorators: [
    (Story, context) => (
      <AutomationListProvider
        automations={
          context.parameters.empty
            ? []
            : [
                savedAutomation,
                {
                  ...savedAutomation,
                  id: "second",
                  name: "Dateieingang",
                  enabled: false,
                  trigger: {
                    type: "storage",
                    storage: {
                      type: "documentRepository",
                      documentRepositoryId: "demo",
                      workspaceId: "demo",
                    },
                    events: ["processed"],
                    folder: "",
                    includeSubfolders: true,
                    attachment: "copy",
                  },
                },
              ]
        }
        userPreferences={context.parameters.preferences ?? {}}
        favorites={context.parameters.favorites}
      >
        <HeaderMain>
          <HeaderMainContent>Automationen</HeaderMainContent>
          <HeaderMainAsideContent>
            <AutomationListOptionsDropdown />
          </HeaderMainAsideContent>
        </HeaderMain>
        <Story />
      </AutomationListProvider>
    ),
  ],
} satisfies Meta<typeof AutomationList>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Table: Story = { parameters: { preferences: { view: "table" } } };
export const Empty: Story = { parameters: { empty: true } };
export const Grouped: Story = {
  parameters: { preferences: { group: "trigger", sort: "name:asc" } },
};

export const Favorites: Story = {
  parameters: {
    preferences: { group: "favorite" },
    favorites: {
      version: "favorites-v2",
      showInSidebar: true,
      favorites: [{ type: "automation", id: savedAutomation.id }],
    },
  },
};
