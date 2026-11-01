import { openMenu } from "../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MediaPlayer } from "../../../app/_components/transcription/MediaPlayer";

const meta = {
  title: "Web/transcription/MediaPlayer",
  component: MediaPlayer,
  args: { filePath: "/" },
} satisfies Meta<typeof MediaPlayer>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const FilePath_missing: Story = { args: { filePath: undefined } };
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const MenuOpened: Story = { play: openMenu };
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

export const Loading: Story = {
  parameters: {
    contextFixtures: { useMediaPlayerContext: { loading: "loading" } },
  },
};
export const Seeking: Story = {
  parameters: {
    contextFixtures: {
      useMediaPlayerContext: { loading: "seeking", hasVideo: true },
    },
  },
};
export const Buffering: Story = {
  parameters: {
    contextFixtures: {
      useMediaPlayerContext: { loading: "buffering", isPlaying: true },
    },
  },
};
