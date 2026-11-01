import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ArtifactContext } from "../../../../app/(settings)/artifacts/_components/ArtifactContext";
import { serviceArtifacts } from "../../service/fixtures";
const meta = {
  title: "Web/(settings)/artifacts/ArtifactContext",
  component: ArtifactContext,
  args: { artifacts: serviceArtifacts },
} satisfies Meta<typeof ArtifactContext>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Empty: Story = { args: { artifacts: [] } };
