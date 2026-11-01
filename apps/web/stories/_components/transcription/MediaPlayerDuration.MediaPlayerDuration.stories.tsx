import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MediaPlayerDuration } from "../../../app/_components/transcription/MediaPlayerDuration";

const meta = {
  title: "Web/transcription/MediaPlayerDuration/MediaPlayerDuration",
  component: MediaPlayerDuration,
  args: {},
} satisfies Meta<typeof MediaPlayerDuration>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const MediaNoDuration: Story = {
  parameters: {
    contextFixtures: { useMediaPlayerContext: { duration: 0, currentTime: 0 } },
  },
};
export const MediaPlaying: Story = {
  parameters: {
    contextFixtures: {
      useMediaPlayerContext: {
        isPlaying: true,
        duration: 120,
        currentTime: 30,
      },
    },
  },
};
export const MediaPaused: Story = {
  parameters: {
    contextFixtures: {
      useMediaPlayerContext: {
        isPlaying: false,
        duration: 120,
        currentTime: 30,
      },
    },
  },
};
export const MediaFinished: Story = {
  parameters: {
    contextFixtures: {
      useMediaPlayerContext: { currentTime: 120, duration: 120 },
    },
  },
};
export const MediaMuted: Story = {
  parameters: { contextFixtures: { useMediaPlayerContext: { volume: 0 } } },
};
export const MediaLowVolume: Story = {
  parameters: { contextFixtures: { useMediaPlayerContext: { volume: 0.2 } } },
};
export const MediaFullVolume: Story = {
  parameters: { contextFixtures: { useMediaPlayerContext: { volume: 1 } } },
};
export const MediaVideo: Story = {
  parameters: {
    contextFixtures: { useMediaPlayerContext: { hasVideo: true } },
  },
};
export const Rate0_25: Story = {
  parameters: { contextFixtures: { useMediaPlayerContext: { rate: 0.25 } } },
};
export const Rate0_5: Story = {
  parameters: { contextFixtures: { useMediaPlayerContext: { rate: 0.5 } } },
};
export const Rate1: Story = {
  parameters: { contextFixtures: { useMediaPlayerContext: { rate: 1 } } },
};
export const Rate1_5: Story = {
  parameters: { contextFixtures: { useMediaPlayerContext: { rate: 1.5 } } },
};
export const Rate2: Story = {
  parameters: { contextFixtures: { useMediaPlayerContext: { rate: 2 } } },
};
