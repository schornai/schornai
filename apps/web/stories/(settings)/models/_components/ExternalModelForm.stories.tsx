import { expect, userEvent, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ExternalModelForm } from "../../../../app/(settings)/models/_components/ExternalModelForm";
const meta = {
  title: "Web/(settings)/models/ExternalModelForm",
  component: ExternalModelForm,
  args: { provider: "openai" },
  decorators: [
    (Story) => (
      <div className="min-h-[800px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ExternalModelForm>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Compatible: Story = { args: { provider: "openai-compatible" } };
export const Azure: Story = { args: { provider: "openai-azure" } };
export const Bedrock: Story = { args: { provider: "antropic-aws" } };
export const Existing: Story = {
  play: async ({ canvas }) => {
    await canvas.findByText("1 Modelle gefunden", {}, { timeout: 5000 });
  },
  args: {
    initial: {
      id: "external",
      name: "Team model",
      modelId: "example-chat",
      baseUrl: "https://api.openai.com/v1",
    },
  },
};

export const LoadedModels: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.type(
      canvas.getByLabelText("API-Schlüssel"),
      "storybook-key",
    );
    await canvas.findByText("1 Modelle gefunden", {}, { timeout: 5000 });
    const input = canvas.getByRole("combobox", {
      name: "Modellkennung beim Anbieter",
    });
    await userEvent.click(input);
    const body = within(canvasElement.ownerDocument.body);
    const option = await body.findByRole("option", { name: /example-chat/ });
    await expect(option).toBeVisible();
    await userEvent.click(option);
    await userEvent.tab();
    await expect(input).toHaveValue("example-chat");
  },
};
export const ManualIdentifier: Story = {
  play: async ({ canvas, canvasElement }) => {
    const input = canvas.getByRole("combobox", {
      name: "Modellkennung beim Anbieter",
    });
    await userEvent.type(input, "private/model-v2");
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      await body.findByRole("option", { name: /private\/model-v2/ }),
    );
    await userEvent.tab();
    await expect(input).toHaveValue("private/model-v2");
  },
};
export const KeyboardSelection: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(
      canvas.getByLabelText("API-Schlüssel"),
      "storybook-key",
    );
    await canvas.findByText("1 Modelle gefunden", {}, { timeout: 5000 });
    const input = canvas.getByRole("combobox", {
      name: "Modellkennung beim Anbieter",
    });
    await userEvent.type(input, "example");
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await expect(input).toHaveValue("example-chat");
  },
};
