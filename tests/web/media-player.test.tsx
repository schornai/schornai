// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MediaPlayerContext,
  useMediaPlayerContext,
} from "../../apps/web/app/_components/transcription/MediaPlayerContext";
afterEach(cleanup);
const play = vi.fn();
const pause = vi.fn();
beforeEach(() => {
  play.mockReset().mockResolvedValue(undefined);
  pause.mockReset();
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(pause);
});
function mount(filePath = "audio.mp3", durationHint = 0) {
  let value: ReturnType<typeof useMediaPlayerContext>;
  const Probe = () => {
    value = useMediaPlayerContext();
    return <video data-testid="video" ref={value.videoRef} />;
  };
  const view = render(
    <MediaPlayerContext filePath={filePath} durationHint={durationHint}>
      <Probe />
    </MediaPlayerContext>,
  );
  return {
    ...view,
    video: view.getByTestId("video") as HTMLVideoElement,
    get value() {
      return value!;
    },
    Probe,
  };
}
describe("media playback context", () => {
  it("supplies safe defaults when no media element is mounted", () => {
    const { result } = renderHook(useMediaPlayerContext);
    expect(result.current).toMatchObject({
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      volume: 1,
      rate: 1,
    });
    result.current.play();
    result.current.pause();
    result.current.playUntil(5);
    result.current.setCurrentTime(2);
    result.current.setRate(2);
    result.current.setVolume(0.5);
    const absent = renderHook(useMediaPlayerContext, {
      wrapper: ({ children }) => (
        <MediaPlayerContext>{children}</MediaPlayerContext>
      ),
    });
    act(() => {
      absent.result.current.play();
      absent.result.current.pause();
      absent.result.current.playUntil(5);
      absent.result.current.setCurrentTime(2);
      absent.result.current.setRate(2);
      absent.result.current.setVolume(0.5);
    });
    expect(play).not.toHaveBeenCalled();
  });
  it("synchronizes metadata and playback events, including unknown duration", () => {
    const media = mount();
    const video = media.video;
    Object.defineProperties(video, {
      duration: { value: 120, configurable: true },
      videoHeight: { value: 100, configurable: true },
      videoWidth: { value: 100, configurable: true },
    });
    fireEvent.loadedMetadata(video);
    expect(media.value.duration).toBe(120);
    expect(media.value.hasVideo).toBe(true);
    fireEvent.play(video);
    expect(media.value.isPlaying).toBe(true);
    fireEvent.pause(video);
    expect(media.value.isPlaying).toBe(false);
    act(() => media.value.setCurrentTime(15));
    fireEvent.timeUpdate(video);
    expect(media.value.currentTime).toBe(15);
    act(() => media.value.setVolume(0.5));
    fireEvent.volumeChange(video);
    expect(media.value.volume).toBe(0.5);
    act(() => media.value.setRate(2));
    fireEvent.rateChange(video);
    expect(media.value.rate).toBe(2);
    Object.defineProperty(video, "duration", { value: 0, configurable: true });
    fireEvent.timeUpdate(video);
    expect(media.value.currentTime).toBe(15);
    Object.defineProperty(video, "videoWidth", {
      value: 0,
      configurable: true,
    });
    fireEvent.loadedMetadata(video);
    expect(media.value.hasVideo).toBe(false);
  });
  it("stops at media time despite buffering and speed changes", () => {
    vi.useFakeTimers();
    const media = mount();
    act(() => {
      media.video.currentTime = 10;
      media.value.playUntil(14);
    });
    act(() => vi.advanceTimersByTime(5000));
    expect(pause).not.toHaveBeenCalled();
    act(() => media.value.setRate(2));
    media.video.currentTime = 14.1;
    fireEvent.timeUpdate(media.video);
    expect(pause).toHaveBeenCalledOnce();
    expect(media.video.currentTime).toBe(14);
  });
  it("cancels segment bounds on seek and normal playback", () => {
    const media = mount();
    act(() => {
      media.value.playUntil(5);
      media.value.setCurrentTime(10);
    });
    fireEvent.timeUpdate(media.video);
    expect(pause).not.toHaveBeenCalled();
    act(() => {
      media.value.playUntil(12);
      media.value.play();
    });
    media.video.currentTime = 15;
    fireEvent.timeUpdate(media.video);
    expect(pause).not.toHaveBeenCalled();
  });
  it("handles rejected playback and non-finite metadata", async () => {
    const media = mount();
    fireEvent.loadedMetadata(media.video);
    expect(media.value.duration).toBe(0);
    play.mockRejectedValueOnce(new Error("unavailable"));
    await act(async () => media.value.play());
    expect(media.value.error).toBe(true);
    fireEvent.ended(media.video);
    expect(media.value.isPlaying).toBe(false);
  });
  it("shows loading and seeking until media data is ready, including paused seeks", () => {
    const media = mount();
    expect(media.value.loading).toBe("loading");
    Object.defineProperty(media.video, "readyState", {
      value: 1,
      configurable: true,
    });
    fireEvent.loadedMetadata(media.video);
    expect(media.value.loading).toBe("loading");
    Object.defineProperty(media.video, "readyState", {
      value: 2,
      configurable: true,
    });
    fireEvent.loadedData(media.video);
    expect(media.value.loading).toBeNull();
    Object.defineProperty(media.video, "seeking", {
      value: true,
      configurable: true,
    });
    fireEvent.seeking(media.video);
    expect(media.value.loading).toBe("seeking");
    fireEvent.canPlay(media.video);
    expect(media.value.loading).toBe("seeking");
    Object.defineProperty(media.video, "seeking", {
      value: false,
      configurable: true,
    });
    fireEvent.seeked(media.video);
    expect(media.value.loading).toBeNull();
    fireEvent.waiting(media.video);
    expect(media.value.loading).toBe("buffering");
    fireEvent.playing(media.video);
    expect(media.value.loading).toBeNull();
    fireEvent.stalled(media.video);
    expect(media.value.loading).toBeNull();
    fireEvent.waiting(media.video);
    fireEvent.error(media.video);
    expect(media.value.loading).toBeNull();
    expect(media.value.error).toBe(true);
  });
  it("cleans up bounded playback timers and event subscriptions on unmount", () => {
    vi.useFakeTimers();
    const media = mount();
    const remove = vi.spyOn(media.video, "removeEventListener");
    act(() => media.value.playUntil(20));
    media.unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(pause).toHaveBeenCalledOnce();
    expect(media.video.currentTime).toBe(0);
    expect(remove.mock.calls.map(([event]) => event)).toEqual(
      expect.arrayContaining([
        "loadedmetadata",
        "play",
        "pause",
        "timeupdate",
        "volumechange",
        "ratechange",
      ]),
    );
  });
});

it("uses the measured recording duration when a recorded WebM has no finite metadata duration", () => {
  const media = mount("blob:recording", 12.5);
  Object.defineProperty(media.video, "duration", {
    value: Infinity,
    configurable: true,
  });
  fireEvent.loadedMetadata(media.video);
  expect(media.value.duration).toBe(12.5);
  act(() => media.value.setCurrentTime(20));
  expect(media.video.currentTime).toBe(12.5);
  Object.defineProperty(media.video, "duration", {
    value: 12.8,
    configurable: true,
  });
  fireEvent.durationChange(media.video);
  expect(media.value.duration).toBe(12.8);
});

it("ignores non-finite controls and clamps valid playback settings", () => {
  const media = mount("audio.mp3", Infinity);
  expect(media.value.duration).toBe(0);
  act(() => {
    media.value.playUntil(Infinity);
    media.value.playUntil(0);
    media.value.setCurrentTime(NaN);
    media.value.setVolume(Infinity);
    media.value.setRate(NaN);
  });
  expect(play).not.toHaveBeenCalled();
  expect(media.value).toMatchObject({ currentTime: 0, volume: 1, rate: 1 });
  act(() => {
    media.value.setCurrentTime(-10);
    media.value.setVolume(0);
    media.value.setRate(-2);
  });
  fireEvent.volumeChange(media.video);
  expect(media.video.muted).toBe(true);
  expect(media.value).toMatchObject({ currentTime: 0, volume: 0, rate: 0.25 });
  act(() => {
    media.value.setVolume(5);
    media.value.setRate(5);
  });
  expect(media.video.muted).toBe(false);
  expect(media.value).toMatchObject({ volume: 1, rate: 2 });
});

it("ignores a stale playback failure after pause and browser aborts", async () => {
  let reject!: (error: Error) => void;
  play.mockImplementationOnce(
    () =>
      new Promise((_, fail) => {
        reject = fail;
      }),
  );
  const media = mount();
  act(() => {
    media.value.play();
    media.value.pause();
  });
  await act(async () => reject(new Error("late failure")));
  expect(media.value.error).toBe(false);
  play.mockRejectedValueOnce(new DOMException("interrupted", "AbortError"));
  await act(async () => media.value.play());
  expect(media.value).toMatchObject({
    error: false,
    loading: null,
    isPlaying: false,
  });
});

it("distinguishes seeking from buffering and retains a real media error on metadata events", () => {
  const media = mount("");
  expect(media.value.loading).toBeNull();
  fireEvent.loadStart(media.video);
  expect(media.value.loading).toBe("loading");
  fireEvent.stalled(media.video);
  expect(media.value.loading).toBe("buffering");
  Object.defineProperty(media.video, "seeking", {
    value: true,
    configurable: true,
  });
  fireEvent.waiting(media.video);
  expect(media.value.loading).toBe("seeking");
  fireEvent.stalled(media.video);
  fireEvent.pause(media.video);
  expect(media.value.loading).toBe("seeking");
  Object.defineProperties(media.video, {
    seeking: { value: false, configurable: true },
    readyState: { value: 2, configurable: true },
    error: { value: { code: 4 }, configurable: true },
    currentTime: { value: NaN, configurable: true },
  });
  fireEvent.pause(media.video);
  expect(media.value.loading).toBeNull();
  fireEvent.error(media.video);
  fireEvent.loadedMetadata(media.video);
  fireEvent.timeUpdate(media.video);
  expect(media.value).toMatchObject({ error: true, currentTime: 0 });
});
