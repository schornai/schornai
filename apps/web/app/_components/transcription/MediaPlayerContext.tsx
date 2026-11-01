"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

const noop = () => {};
const mediaPlayerContext = createContext({
  currentTime: 0,
  duration: 0,
  hasVideo: false,
  isPlaying: false,
  error: false,
  loading: null as "loading" | "buffering" | "seeking" | null,
  rate: 1,
  volume: 1,
  pause: noop,
  play: noop,
  playUntil: (_end: number) => {},
  setCurrentTime: (_time: number) => {},
  setRate: (_rate: number) => {},
  setVolume: (_volume: number) => {},
  videoRef: null as React.RefObject<HTMLVideoElement | null> | null,
});

export function useMediaPlayerContext() {
  return useContext(mediaPlayerContext);
}

export function MediaPlayerContext({
  filePath,
  durationHint = 0,
  children,
}: {
  filePath?: string;
  durationHint?: number;
  children: React.ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopAt = useRef<number | null>(null);
  const generation = useRef(0);
  const [hasVideo, setHasVideo] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState<
    "loading" | "buffering" | "seeking" | null
  >(filePath ? "loading" : null);
  const [error, setError] = useState(false);
  const fallbackDuration = Number.isFinite(durationHint)
    ? Math.max(0, durationHint)
    : 0;
  const [duration, setDuration] = useState(fallbackDuration);
  const [currentTime, setCurrentTimeState] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [rate, setRateState] = useState(1);

  const start = () => {
    const video = videoRef.current;
    if (!video) return;
    const request = ++generation.current;
    setError(false);
    void video.play().catch((cause: unknown) => {
      if (request !== generation.current) return;
      stopAt.current = null;
      setIsPlaying(false);
      setLoading(null);
      if (!(cause instanceof DOMException && cause.name === "AbortError"))
        setError(true);
    });
  };
  const play = () => {
    stopAt.current = null;
    start();
  };
  const pause = () => {
    generation.current++;
    stopAt.current = null;
    videoRef.current?.pause();
    setIsPlaying(false);
  };
  const playUntil = (end: number) => {
    if (
      !videoRef.current ||
      !Number.isFinite(end) ||
      end <= videoRef.current.currentTime
    )
      return;
    stopAt.current = end;
    start();
  };
  const setCurrentTime = (time: number) => {
    stopAt.current = null;
    const video = videoRef.current;
    if (!video || !Number.isFinite(time)) return;
    const maximum = Number.isFinite(video.duration)
      ? video.duration
      : fallbackDuration || Infinity;
    video.currentTime = Math.max(0, Math.min(time, maximum));
    setCurrentTimeState(video.currentTime);
  };
  const setVolume = (value: number) => {
    if (!videoRef.current || !Number.isFinite(value)) return;
    videoRef.current.volume = Math.max(0, Math.min(1, value));
    videoRef.current.muted = value === 0;
    setVolumeState(videoRef.current.volume);
  };
  const setRate = (value: number) => {
    if (!videoRef.current || !Number.isFinite(value)) return;
    videoRef.current.playbackRate = Math.max(0.25, Math.min(2, value));
    setRateState(videoRef.current.playbackRate);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    stopAt.current = null;
    setCurrentTimeState(0);
    setDuration(fallbackDuration);
    setHasVideo(false);
    setIsPlaying(false);
    setError(false);
    setLoading(filePath && video.readyState < 2 ? "loading" : null);
    const metadata = () => {
      if (!video.error) setError(false);
      setDuration(
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : fallbackDuration,
      );
      setHasVideo(video.videoWidth > 0 && video.videoHeight > 0);
    };
    const time = () => {
      if (stopAt.current !== null && video.currentTime >= stopAt.current) {
        const end = stopAt.current;
        stopAt.current = null;
        video.pause();
        video.currentTime = end;
        setIsPlaying(false);
      }
      setCurrentTimeState(
        Number.isFinite(video.currentTime) ? video.currentTime : 0,
      );
    };
    const playing = () => {
      setIsPlaying(true);
      setError(false);
    };
    const paused = () => {
      if (!video.seeking && video.readyState >= 2) setLoading(null);
      setIsPlaying(false);
    };
    const ready = () => {
      if (!video.seeking && video.readyState >= 2) setLoading(null);
    };
    const ended = () => {
      setLoading(null);
      stopAt.current = null;
      setIsPlaying(false);
      time();
    };
    const failed = () => {
      setLoading(null);
      stopAt.current = null;
      setError(true);
      setIsPlaying(false);
    };
    const volumeChanged = () => setVolumeState(video.muted ? 0 : video.volume);
    const rateChanged = () => setRateState(video.playbackRate);
    const events = {
      loadstart: () => setLoading("loading"),
      seeking: () => setLoading("seeking"),
      seeked: ready,
      loadeddata: ready,
      canplay: ready,
      playing: () => {
        playing();
        setLoading(null);
      },
      waiting: () => setLoading(video.seeking ? "seeking" : "buffering"),
      stalled: () => {
        if (video.readyState < 2)
          setLoading(video.seeking ? "seeking" : "buffering");
      },
      loadedmetadata: metadata,
      durationchange: metadata,
      play: playing,
      pause: paused,
      ended,
      timeupdate: time,
      volumechange: volumeChanged,
      ratechange: rateChanged,
      error: failed,
    };
    for (const [name, handler] of Object.entries(events))
      video.addEventListener(name, handler);
    if (video.readyState >= 1) metadata();
    volumeChanged();
    rateChanged();
    // Check media time, not elapsed wall time: buffering and rate changes must
    // not shorten or extend a selected transcript segment.
    let frame: number;
    const tick = () => {
      if (stopAt.current !== null) time();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      generation.current++;
      stopAt.current = null;
      cancelAnimationFrame(frame);
      for (const [name, handler] of Object.entries(events))
        video.removeEventListener(name, handler);
      video.pause();
    };
  }, [filePath, fallbackDuration]);

  return (
    <mediaPlayerContext.Provider
      value={{
        currentTime,
        duration,
        hasVideo,
        isPlaying,
        error,
        loading,
        pause,
        play,
        playUntil,
        rate,
        setCurrentTime,
        setRate,
        setVolume,
        videoRef,
        volume,
      }}
    >
      {children}
    </mediaPlayerContext.Provider>
  );
}
