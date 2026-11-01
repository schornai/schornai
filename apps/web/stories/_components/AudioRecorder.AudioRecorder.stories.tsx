import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor, within } from "storybook/test";
import { AudioRecorder } from "../../app/_components/AudioRecorder";

class StoryRecorder {
  static isTypeSupported(type: string) {
    return type.startsWith("audio/webm");
  }
  mimeType = "audio/webm";
  state = "inactive";
  ondataavailable?: (event: { data: Blob }) => void;
  onstop?: () => void;
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({
      data: new Blob(["storybook-audio"], { type: this.mimeType }),
    });
    this.onstop?.();
  }
}
const meta = {
  title: "Web/AudioRecorder",
  component: AudioRecorder,
  args: { appColor: { oklchHue: 284, type: "color-oklch-hue" } },
  beforeEach: (context) => {
    const descriptor = Object.getOwnPropertyDescriptor(
      navigator,
      "mediaDevices",
    );
    const original = globalThis.MediaRecorder;
    const originalAudioContext = globalThis.AudioContext;
    const amplitude = context.parameters.audioAmplitude ?? 0.06;
    // A deterministic microphone meter for previews and visual references.
    // Never request access to the viewer's physical microphone in Storybook.
    globalThis.AudioContext = class {
      state = "running";
      async resume() {}
      async close() {
        this.state = "closed";
      }
      createMediaStreamSource() {
        return { connect() {}, disconnect() {} };
      }
      createAnalyser() {
        return {
          fftSize: 512,
          getFloatTimeDomainData: (samples: Float32Array) =>
            samples.fill(amplitude),
          disconnect() {},
        };
      }
    } as unknown as typeof AudioContext;
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }),
      },
    });
    globalThis.MediaRecorder = StoryRecorder as unknown as typeof MediaRecorder;
    return () => {
      if (descriptor)
        Object.defineProperty(navigator, "mediaDevices", descriptor);
      else Reflect.deleteProperty(navigator, "mediaDevices");
      globalThis.MediaRecorder = original;
      globalThis.AudioContext = originalAudioContext;
    };
  },
} satisfies Meta<typeof AudioRecorder>;
export default meta;
type Story = StoryObj<typeof meta>;
const start: NonNullable<Story["play"]> = async ({
  canvasElement,
  userEvent,
  parameters,
}) => {
  const canvas = within(canvasElement);
  await userEvent.click(
    canvas.getByRole("button", { name: /aufnahme starten|start recording/i }),
  );
  await canvas.findByRole("button", {
    name: /aufnahme stoppen|stop recording/i,
  });
  await expect(canvas.getByRole("timer")).toHaveTextContent("00:00");
  // Let the envelope settle so the volume states have stable screenshots.
  await waitFor(() =>
    expect(
      Number(
        canvasElement
          .querySelector<HTMLElement>('[data-slot="recording-orb"]')
          ?.style.getPropertyValue("--audio-level"),
      ),
    ).toBe(
      Number(
        Math.min(
          1,
          Math.pow(
            Math.max(0, (parameters.audioAmplitude ?? 0.06) - 0.008) * 5,
            0.65,
          ),
        ).toFixed(3),
      ),
    ),
  );
};
const record: NonNullable<Story["play"]> = async (context) => {
  await start(context);
  await context.userEvent.click(
    within(context.canvasElement).getByRole("button", {
      name: /aufnahme stoppen|stop recording/i,
    }),
  );
};
export const Default: Story = {};
export const Recording: Story = { play: start };
export const GreenRecording: Story = {
  args: { appColor: { oklchHue: 140, type: "color-oklch-hue" } },
  play: start,
};
export const AmberRecording: Story = {
  args: { appColor: { oklchHue: 85, type: "color-oklch-hue" } },
  play: start,
};
export const RgbRecording: Story = {
  args: {
    appColor: {
      blue: 60,
      green: 80,
      opacity: 0.4,
      red: 220,
      type: "color-rgb",
    },
  },
  play: start,
};
export const QuietRecording: Story = {
  parameters: { audioAmplitude: 0.002 },
  play: start,
};
export const LoudRecording: Story = {
  parameters: { audioAmplitude: 0.2 },
  play: start,
};
export const Preview: Story = { play: record };
export const Saved: Story = {
  play: async (context) => {
    await record(context);
    const canvas = within(context.canvasElement);
    await context.userEvent.click(
      canvas.getByRole("button", {
        name: /speichern und transkribieren|save and transcribe/i,
      }),
    );
    await canvas.findByText(/aufnahme gespeichert|recording saved/i);
  },
};
export const PermissionDenied: Story = {
  play: async ({ canvasElement, userEvent }) => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          throw new DOMException("Denied", "NotAllowedError");
        },
      },
    });
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: /aufnahme starten|start recording/i }),
    );
    await canvas.findByRole("alert");
  },
};
