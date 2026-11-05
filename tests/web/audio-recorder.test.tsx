// @vitest-environment jsdom
import "./client-setup";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  AudioRecorderProvider,
  AudioRecorderButton,
} from "../../apps/web/app/_components/AudioRecorderModal";
import { AudioRecorder } from "../../apps/web/app/_components/AudioRecorder";
import { fileNeedsProcessing } from "../../packages/utils/src/getFileTypeLabel";

const mocks = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock("../../apps/web/app/_components/FileUploadProvider", () => ({
  useFileUpload: () => ({ queueFileUploadsByFiles: mocks.upload }),
}));
const trackStop = vi.fn();
const getUserMedia = vi.fn();
const createUrl = vi.fn(() => "blob:recording");
const revokeUrl = vi.fn();
let instances: FakeRecorder[];
let supported = "audio/webm;codecs=opus";
let emitAudio = true;
let failStart = false;
class FakeRecorder {
  static isTypeSupported(type: string) {
    return type === supported;
  }
  mimeType: string;
  state = "inactive";
  ondataavailable?: (event: { data: Blob }) => void;
  onstop?: () => void;
  onerror?: () => void;
  start = vi.fn(() => {
    if (failStart) throw new Error("Cannot start recording");
    this.state = "recording";
  });
  stop = vi.fn(() => {
    this.state = "inactive";
    if (emitAudio)
      this.ondataavailable?.({
        data: new Blob(["audio"], { type: this.mimeType }),
      });
    this.onstop?.();
  });
  constructor(_stream: unknown, options?: { mimeType: string }) {
    this.mimeType = options?.mimeType ?? "audio/mp4";
    instances.push(this);
  }
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  instances = [];
  emitAudio = true;
  failStart = false;
  supported = "audio/webm;codecs=opus";
  trackStop.mockClear();
  getUserMedia
    .mockReset()
    .mockResolvedValue({ getTracks: () => [{ stop: trackStop }] });
  createUrl.mockClear();
  revokeUrl.mockClear();
  mocks.upload.mockReset().mockResolvedValue([{ state: "success" }]);
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL = createUrl;
      static revokeObjectURL = revokeUrl;
    },
  );
});
async function start() {
  fireEvent.click(screen.getByRole("button", { name: "labelStart" }));
  await screen.findByRole("button", { name: "labelStop" });
}
async function record() {
  await start();
  fireEvent.click(screen.getByRole("button", { name: "labelStop" }));
  await screen.findByRole("button", { name: "labelTranscribe" });
}
it.each([
  ["audio/webm;codecs=opus", "webm"],
  ["audio/mp4", "m4a"],
  ["audio/ogg;codecs=opus", "ogg"],
  ["unsupported-preference", "m4a"],
])(
  "records supported audio as %s and sends it through the transcription upload path",
  async (type, extension) => {
    supported = type;
    render(<AudioRecorder />);
    expect(getUserMedia).not.toHaveBeenCalled();
    await record();
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(trackStop).toHaveBeenCalledOnce();
    expect(screen.getByLabelText("labelPreview").getAttribute("src")).toBe(
      "blob:recording",
    );
    const unsaved = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unsaved);
    expect(unsaved.defaultPrevented).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "labelTranscribe" }));
    await screen.findByText("descriptionSaved");
    const file = mocks.upload.mock.calls[0][0][0];
    expect(file).toBeInstanceOf(File);
    expect(file.name.endsWith(`.${extension}`)).toBe(true);
    expect(file.size).toBeGreaterThan(0);
    expect(file.type).toBe(instances[0].mimeType);
    expect(fileNeedsProcessing(file.name)).toBe("transcript");
    // The saved label commits before React necessarily cleans up the unload effect.
    await waitFor(() => {
      const saved = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(saved);
      expect(saved.defaultPrevented).toBe(false);
    });
    cleanup();
    expect(revokeUrl).toHaveBeenCalledWith("blob:recording");
  },
);
it("reports denied microphone access and lets the user retry", async () => {
  getUserMedia.mockRejectedValueOnce(
    new DOMException("denied", "NotAllowedError"),
  );
  render(<AudioRecorder />);
  fireEvent.click(screen.getByRole("button", { name: "labelStart" }));
  await screen.findByText("errorPermission");
  expect(mocks.upload).not.toHaveBeenCalled();
  await start();
  expect(screen.queryByRole("alert")).toBeNull();
});
it("handles missing recording support without requesting the microphone", async () => {
  vi.stubGlobal("MediaRecorder", undefined);
  render(<AudioRecorder />);
  fireEvent.click(screen.getByRole("button", { name: "labelStart" }));
  expect(await screen.findByText("errorUnsupported")).toBeTruthy();
  expect(getUserMedia).not.toHaveBeenCalled();
});

it("reports missing media devices before opening a microphone", async () => {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: undefined,
  });
  render(<AudioRecorder />);
  fireEvent.click(screen.getByRole("button", { name: "labelStart" }));
  await screen.findByText("errorUnsupported");
  expect(getUserMedia).not.toHaveBeenCalled();
});

it.each([false, true])(
  "ignores a late upload completion after unmount (reject=%s)",
  async (reject) => {
    const pending = Promise.withResolvers<unknown>();
    mocks.upload.mockReturnValueOnce(pending.promise);
    const finished = vi.fn();
    const view = render(<AudioRecorder onFinished={finished} />);
    await record();
    fireEvent.click(screen.getByRole("button", { name: "labelTranscribe" }));
    await screen.findByText("labelUploading");
    view.unmount();
    await act(async () => {
      if (reject) pending.reject(new Error("late failure"));
      else pending.resolve([{ state: "success" }]);
    });
    expect(finished).not.toHaveBeenCalled();
    expect(revokeUrl).toHaveBeenCalledWith("blob:recording");
  },
);

it("ignores empty data chunks and uses the chunk MIME type when the recorder omits it", async () => {
  render(<AudioRecorder />);
  await start();
  const recorder = instances[0]!;
  recorder.mimeType = "";
  emitAudio = false;
  act(() => {
    recorder.ondataavailable?.({ data: new Blob([]) });
    recorder.ondataavailable?.({
      data: new Blob(["audio"], { type: "audio/ogg" }),
    });
  });
  fireEvent.click(screen.getByRole("button", { name: "labelStop" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "labelTranscribe" }),
  );
  await screen.findByText("descriptionSaved");
  expect(mocks.upload.mock.calls[0]![0][0]).toMatchObject({
    type: "audio/ogg",
    size: 5,
  });
});

it.each([
  [{ type: "color-oklch-hue" as const, oklchHue: 42 }, "oklch(70% 0.15 42)"],
  [{ type: "color-rgb" as const, red: 1, green: 2, blue: 3 }, "rgb(1 2 3)"],
])("uses the configured recording colour (%j)", (appColor, expected) => {
  const view = render(<AudioRecorder appColor={appColor} />);
  const area = view.container.querySelector<HTMLElement>(
    '[style*="--orb-color"]',
  );
  expect(area?.style.getPropertyValue("--orb-color")).toBe(expected);
});

it("ignores recorder errors from a discarded clip after a new recording starts", async () => {
  render(<AudioRecorder />);
  await record();
  const previous = instances[0]!;
  fireEvent.click(screen.getByRole("button", { name: "labelDiscard" }));
  await start();
  act(() => previous.onerror?.());
  expect(screen.queryByText("errorRecording")).toBeNull();
  expect(screen.getByRole("button", { name: "labelStop" })).toBeTruthy();
  expect(trackStop).toHaveBeenCalledOnce();
});
it("keeps the recording for retry after a failed upload", async () => {
  mocks.upload.mockResolvedValueOnce([{ state: "error" }]);
  render(<AudioRecorder />);
  await record();
  fireEvent.click(screen.getByRole("button", { name: "labelTranscribe" }));
  await screen.findByText("errorUpload");
  expect(screen.getByLabelText("labelPreview")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "labelTranscribe" }));
  await screen.findByText("descriptionSaved");
  expect(mocks.upload).toHaveBeenCalledTimes(2);
  expect(getUserMedia).toHaveBeenCalledOnce();
});
it("discards local audio without uploading it and revokes its preview", async () => {
  render(<AudioRecorder />);
  await record();
  fireEvent.click(screen.getByRole("button", { name: "labelDiscard" }));
  expect(revokeUrl).toHaveBeenCalledWith("blob:recording");
  expect(screen.queryByLabelText("labelPreview")).toBeNull();
  expect(mocks.upload).not.toHaveBeenCalled();
});
it.each([false, true])(
  "preserves the clip and its saved=%s status when cancelling a replacement recording",
  async (saved) => {
    render(<AudioRecorder />);
    await record();
    if (saved) {
      fireEvent.click(screen.getByRole("button", { name: "labelTranscribe" }));
      await screen.findByText("descriptionSaved");
    }
    let resolve!: (stream: unknown) => void;
    getUserMedia.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "labelRecordAgain" }));
    fireEvent.click(screen.getByRole("button", { name: "labelCancel" }));
    expect(screen.getByLabelText("labelPreview").getAttribute("src")).toBe(
      "blob:recording",
    );
    expect(revokeUrl).not.toHaveBeenCalled();
    expect(
      (
        screen.getByRole("button", {
          name: "labelTranscribe",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(saved);
    const lateStop = vi.fn();
    await act(async () => resolve({ getTracks: () => [{ stop: lateStop }] }));
    expect(lateStop).toHaveBeenCalledOnce();
    expect(instances).toHaveLength(1);
    if (!saved) {
      fireEvent.click(screen.getByRole("button", { name: "labelTranscribe" }));
      await screen.findByText("descriptionSaved");
    }
    expect(mocks.upload).toHaveBeenCalledOnce();
  },
);
it.each([false, true])(
  "preserves the clip and its saved=%s status when a replacement recorder fails to start",
  async (saved) => {
    render(<AudioRecorder />);
    await record();
    if (saved) {
      fireEvent.click(screen.getByRole("button", { name: "labelTranscribe" }));
      await screen.findByText("descriptionSaved");
    }
    failStart = true;
    fireEvent.click(screen.getByRole("button", { name: "labelRecordAgain" }));
    await screen.findByText("errorRecording");
    expect(screen.getByLabelText("labelPreview").getAttribute("src")).toBe(
      "blob:recording",
    );
    expect(revokeUrl).not.toHaveBeenCalled();
    expect(trackStop).toHaveBeenCalledTimes(2);
    expect(
      (
        screen.getByRole("button", {
          name: "labelTranscribe",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(saved);
    if (!saved) {
      fireEvent.click(screen.getByRole("button", { name: "labelTranscribe" }));
      await screen.findByText("descriptionSaved");
    }
    expect(mocks.upload).toHaveBeenCalledOnce();
  },
);
it.each(["cancel", "unmount"])(
  "releases a microphone granted after %s",
  async (mode) => {
    let resolve!: (stream: unknown) => void;
    getUserMedia.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const view = render(<AudioRecorder />);
    fireEvent.click(screen.getByRole("button", { name: "labelStart" }));
    if (mode === "cancel")
      fireEvent.click(screen.getByRole("button", { name: "labelCancel" }));
    else view.unmount();
    await act(async () => resolve({ getTracks: () => [{ stop: trackStop }] }));
    expect(trackStop).toHaveBeenCalledOnce();
    expect(instances).toHaveLength(0);
    expect(createUrl).not.toHaveBeenCalled();
  },
);
it("ignores a cancelled request's rejection after a new recording has started", async () => {
  let reject!: (error: Error) => void;
  getUserMedia.mockReturnValueOnce(
    new Promise((_resolve, fail) => {
      reject = fail;
    }),
  );
  render(<AudioRecorder />);
  fireEvent.click(screen.getByRole("button", { name: "labelStart" }));
  fireEvent.click(screen.getByRole("button", { name: "labelCancel" }));
  await start();
  await act(async () => reject(new Error("old request failed")));
  expect(trackStop).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "labelStop" })).toBeTruthy();
});
it("stops an active recorder on unmount and never creates a discarded preview", async () => {
  const view = render(<AudioRecorder />);
  await start();
  view.unmount();
  expect(instances[0].stop).toHaveBeenCalledOnce();
  expect(trackStop).toHaveBeenCalledOnce();
  expect(createUrl).not.toHaveBeenCalled();
});
it("reports empty recordings and releases the microphone", async () => {
  emitAudio = false;
  render(<AudioRecorder />);
  await start();
  fireEvent.click(screen.getByRole("button", { name: "labelStop" }));
  await screen.findByText("errorEmpty");
  expect(trackStop).toHaveBeenCalledOnce();
  expect(createUrl).not.toHaveBeenCalled();
});
it("releases the microphone on recorder errors and ignores the ensuing stop event", async () => {
  render(<AudioRecorder />);
  await start();
  act(() => {
    instances[0].onerror?.();
    instances[0].stop();
  });
  await screen.findByText("errorRecording");
  expect(trackStop).toHaveBeenCalledOnce();
  expect(createUrl).not.toHaveBeenCalled();
});

function mockAudioMeter(initialAmplitude = 0) {
  let amplitude = initialAmplitude;
  let nextFrame: FrameRequestCallback;
  const close = vi.fn(async () => {});
  const disconnectSource = vi.fn();
  const disconnectAnalyser = vi.fn();
  const connect = vi.fn();
  const createSource = vi.fn(() => ({ connect, disconnect: disconnectSource }));
  const cancelFrame = vi.fn();
  vi.stubGlobal(
    "AudioContext",
    class {
      state = "running";
      close = close;
      resume = vi.fn(async () => {});
      createMediaStreamSource = createSource;
      createAnalyser() {
        return {
          fftSize: 512,
          getFloatTimeDomainData: (samples: Float32Array) =>
            samples.fill(amplitude),
          disconnect: disconnectAnalyser,
        };
      }
    },
  );
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      nextFrame = callback;
      return 42;
    }),
  );
  vi.stubGlobal("cancelAnimationFrame", cancelFrame);
  let time = performance.now();
  return {
    close,
    disconnectSource,
    disconnectAnalyser,
    createSource,
    connect,
    cancelFrame,
    sample: (value: number) => {
      amplitude = value;
      time += 100;
      nextFrame(time);
    },
  };
}

it("makes the orb respond to real sample levels with a soft release and resets it on stop", async () => {
  const meter = mockAudioMeter();
  const view = render(<AudioRecorder />);
  expect(meter.createSource).not.toHaveBeenCalled();
  await start();
  const orb = view.container.querySelector<HTMLElement>(
    '[data-slot="recording-orb"]',
  )!;
  const level = () => Number(orb.style.getPropertyValue("--audio-level"));
  meter.sample(0);
  expect(level()).toBe(0);
  meter.sample(0.04);
  const quiet = level();
  expect(quiet).toBeGreaterThan(0);
  meter.sample(0.2);
  const loud = level();
  expect(loud).toBeGreaterThan(quiet);
  expect(loud).toBeLessThanOrEqual(1);
  meter.sample(0);
  expect(level()).toBeLessThan(loud);
  expect(level()).toBeGreaterThan(0);
  // Only the analyser receives the microphone signal; there is no speaker path.
  expect(meter.connect).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "labelStop" }));
  await screen.findByRole("button", { name: "labelTranscribe" });
  expect(level()).toBe(0);
  expect(orb.dataset.active).toBe("false");
  expect(meter.close).toHaveBeenCalledOnce();
  expect(meter.disconnectSource).toHaveBeenCalledOnce();
  expect(meter.disconnectAnalyser).toHaveBeenCalledOnce();
  expect(meter.cancelFrame).toHaveBeenCalledWith(42);
});

it.each(["unmount", "error"])(
  "cleans up the audio meter on %s",
  async (mode) => {
    const meter = mockAudioMeter(0.1);
    const view = render(<AudioRecorder />);
    await start();
    // The recording button can render before the passive metering effect runs.
    await waitFor(() => expect(meter.createSource).toHaveBeenCalledOnce());
    if (mode === "unmount") view.unmount();
    else {
      act(() => instances[0].onerror?.());
      await screen.findByText("errorRecording");
    }
    await waitFor(() => {
      expect(meter.close).toHaveBeenCalledOnce();
      expect(meter.disconnectSource).toHaveBeenCalledOnce();
      expect(meter.cancelFrame).toHaveBeenCalledWith(42);
      expect(trackStop).toHaveBeenCalledOnce();
    });
  },
);

it("still records and uploads when the audio meter cannot initialise", async () => {
  vi.stubGlobal(
    "AudioContext",
    class {
      constructor() {
        throw new Error("Web Audio unavailable");
      }
    },
  );
  render(<AudioRecorder />);
  await record();
  fireEvent.click(screen.getByRole("button", { name: "labelTranscribe" }));
  await screen.findByText("descriptionSaved");
  expect(mocks.upload).toHaveBeenCalledOnce();
});

function mockWakeLock() {
  const locks: (EventTarget & {
    released: boolean;
    release: ReturnType<typeof vi.fn>;
  })[] = [];
  const request = vi.fn(async () => {
    const lock = Object.assign(new EventTarget(), {
      released: false,
      release: vi.fn(async () => {
        lock.released = true;
        lock.dispatchEvent(new Event("release"));
      }),
    });
    locks.push(lock);
    return lock;
  });
  Object.defineProperty(navigator, "wakeLock", {
    configurable: true,
    value: { request },
  });
  return { request, locks };
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "wakeLock");
});

it("keeps the screen awake only during recording and reacquires after returning to the page", async () => {
  const wake = mockWakeLock();
  render(<AudioRecorder />);
  expect(wake.request).not.toHaveBeenCalled();
  await start();
  await screen.findByText("descriptionScreenAwake");
  expect(wake.request).toHaveBeenCalledWith("screen");
  await act(async () => {
    await wake.locks[0].release();
  });
  expect(screen.getByText("descriptionScreenSleep")).toBeTruthy();
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  await screen.findByText("descriptionScreenAwake");
  expect(wake.request).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole("button", { name: "labelStop" }));
  expect(wake.locks[1].release).toHaveBeenCalledOnce();
});

it.each(["stop", "unmount", "error"])(
  "releases a late wake lock after %s",
  async (mode) => {
    const wake = mockWakeLock();
    let resolve!: (lock: any) => void;
    wake.request.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const view = render(<AudioRecorder />);
    await start();
    if (mode === "unmount") view.unmount();
    else if (mode === "error") act(() => instances[0].onerror?.());
    else fireEvent.click(screen.getByRole("button", { name: "labelStop" }));
    const release = vi.fn(async () => {});
    await act(async () => resolve({ release }));
    expect(release).toHaveBeenCalledOnce();
  },
);

it("can record when the system rejects the wake lock and explains the limitation", async () => {
  const wake = mockWakeLock();
  wake.request.mockRejectedValue(new Error("Low battery"));
  render(<AudioRecorder />);
  await start();
  await screen.findByText("descriptionScreenSleep");
  fireEvent.click(screen.getByRole("button", { name: "labelStop" }));
  expect(screen.getByLabelText("labelPreview")).toBeTruthy();
});

it("opens the modal without requesting audio and protects an unsaved clip until discarded", async () => {
  render(
    <AudioRecorderProvider config={{}}>
      <AudioRecorderButton />
    </AudioRecorderProvider>,
  );
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "labelTitle" }));
  await screen.findByRole("dialog");
  expect(getUserMedia).not.toHaveBeenCalled();
  await start();
  fireEvent.click(screen.getByRole("button", { name: "labelClose" }));
  await screen.findByText("descriptionCloseBlocked");
  fireEvent.click(screen.getByRole("button", { name: "labelStop" }));
  expect(screen.queryByRole("button", { name: "labelClose" })).toBeNull();
  expect(screen.getByLabelText("labelPreview")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "labelDiscard" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("hides recording entry points when no transcriber is configured", () => {
  render(
    <AudioRecorderProvider>
      <AudioRecorderButton />
      <AudioRecorderButton iconOnly />
    </AudioRecorderProvider>,
  );
  expect(screen.queryByRole("button")).toBeNull();
});

it("preserves the modal when its empty-folder trigger disappears during upload", async () => {
  const view = render(
    <AudioRecorderProvider config={{}}>
      <AudioRecorderButton />
    </AudioRecorderProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "labelTitle" }));
  await record();
  let resolve!: (value: unknown) => void;
  mocks.upload.mockReturnValueOnce(
    new Promise((done) => {
      resolve = done;
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "labelTranscribe" }));
  view.rerender(
    <AudioRecorderProvider config={{}}>{null}</AudioRecorderProvider>,
  );
  expect(screen.queryByRole("button", { name: "labelClose" })).toBeNull();
  expect(screen.getByRole("dialog")).toBeTruthy();
  await act(async () => resolve([{ state: "success" }]));

  expect(screen.queryByRole("button", { name: "labelClose" })).toBeNull();
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("keeps a failed upload open for retry, then closes and reopens with a clean recording", async () => {
  render(
    <AudioRecorderProvider config={{}}>
      <AudioRecorderButton />
    </AudioRecorderProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "labelTitle" }));
  await record();
  mocks.upload.mockResolvedValueOnce([{ state: "error" }]);
  fireEvent.click(screen.getByRole("button", { name: "labelTranscribe" }));
  await screen.findByText("errorUpload");
  expect(screen.getByLabelText("labelPreview")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "labelClose" })).toBeNull();
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "labelTranscribe" })),
  );
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "labelTitle" }));
  expect(screen.getByRole("button", { name: "labelStart" })).toBeTruthy();
  expect(screen.queryByLabelText("labelPreview")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "labelClose" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});
