import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MediaPlayerContext } from "../../../app/_components/transcription/MediaPlayerContext";

const meta = {
  title: "Web/transcription/MediaPlayerContext",
  component: MediaPlayerContext,
  args: { filePath: "/", children: "Beispielinhalt" },
} satisfies Meta<typeof MediaPlayerContext>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const FilePath_missing: Story = { args: { filePath: undefined } };
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
