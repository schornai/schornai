import { connectionFixtures } from "../../../../.storybook/connection-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, waitFor } from "storybook/test";
import { useEffect, useState } from "react";
import { AgentEditorRoleWebAccess } from "../../../../app/(main)/agent/_components/AgentEditorRoleWebAccess";
import { useAgentEditor } from "../../../../app/(main)/agent/_components/AgentEditor";
import { defaultWebAccess } from "@schornio/aibox-package-database/agent/webAccess";

const role = {
  id: "web-role",
  prompt: "",
  documentRepositoryMounts: [],
  toolWebAccess: defaultWebAccess,
};
const meta = {
  title: "Web/(main)/agent/AgentEditorRoleWebAccess",
  component: AgentEditorRoleWebAccess,
  args: { role },
  render: function Interactive(args) {
    const [currentRole, setCurrentRole] = useState(args.role);
    useEffect(() => setCurrentRole(args.role), [args.role]);
    mocked(useAgentEditor).mockReturnValue({
      defaultAgent: { roles: [role] },
      hasValidationError: () => false,
      setAgent: () => {},
      relations: {
        connections: connectionFixtures,
        documentRepositories: [],
        models: [],
        workspaces: [],
        theme: { version: "theme-v2", colors: [] },
      },
      setAgentRole: (_id, action) => {
        if (action) setCurrentRole(action);
      },
    } as ReturnType<typeof useAgentEditor>);
    return <AgentEditorRoleWebAccess {...args} role={currentRole} />;
  },
} satisfies Meta<typeof AgentEditorRoleWebAccess>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const FetchWhitelist: Story = {
  args: {
    role: {
      ...role,
      toolWebAccess: {
        ...defaultWebAccess,
        webFetch: "ask",
        webFetchAccess: "allow-list",
        webFetchAllowList: ["example.com", "*.wikipedia.org"],
      },
    },
  },
};
export const Staan: Story = {
  args: {
    role: {
      ...role,
      toolWebAccess: {
        ...defaultWebAccess,
        webFetch: "on",
        webSearch: "on",
        webSearchConnectionId: "00000000-0000-4000-8000-000000000003",
      },
    },
  },
};
export const Brave: Story = {
  args: {
    role: {
      ...role,
      toolWebAccess: {
        ...defaultWebAccess,
        webSearch: "on",
        webSearchProvider: "brave",
        webSearchConnectionId: "00000000-0000-4000-8000-000000000002",
      },
    },
  },
};
export const MissingCredentials: Story = {
  args: {
    role: { ...role, toolWebAccess: { ...defaultWebAccess, webSearch: "on" } },
  },
};
export const RemoveConfirmation: Story = {
  args: Staan.args,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: /Werkzeug entfernen|Remove tool/ }),
    );
  },
};
export const ToggleIndependently: Story = {
  play: async ({ canvas, userEvent }) => {
    const fetch = canvas.getByRole("switch", {
      name: /Web Fetch (einschalten)|Enable Web Fetch/,
    });
    const search = canvas.getByRole("switch", {
      name: /Web Search (einschalten)|Enable Web Search/,
    });
    await userEvent.click(fetch);
    await waitFor(() => expect(fetch).toBeChecked());
    await userEvent.click(search);
    await waitFor(() => expect(search).toBeChecked());
    await expect(fetch).toBeChecked();
    await userEvent.click(fetch);
    await waitFor(() => expect(fetch).not.toBeChecked());
    await expect(search).toBeChecked();
    await expect(
      canvas.getByRole("combobox", {
        name: /Suchverbindung|Search connection/,
      }),
    ).toBeVisible();
  },
};
