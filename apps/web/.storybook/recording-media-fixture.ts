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
export function mockRecordingMedia({
  audioAmplitude = 0.06,
  waitForMicrophone = false,
} = {}) {
  const descriptor = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
  const original = globalThis.MediaRecorder;
  const originalAudioContext = globalThis.AudioContext;
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
        frequencyBinCount: 1024,
        getByteFrequencyData: (bins: Uint8Array) => {
          for (let i = 0; i < bins.length; i++)
            bins[i] =
              (200 * Math.abs(Math.sin(Math.log2(i + 1) * 1.3))) /
              (1 + i / 160);
        },
        getFloatTimeDomainData: (samples: Float32Array) =>
          samples.fill(audioAmplitude),
        disconnect() {},
      };
    }
  } as unknown as typeof AudioContext;
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: async () =>
        waitForMicrophone
          ? new Promise<MediaStream>(() => {})
          : { getTracks: () => [{ stop() {} }] },
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
}
