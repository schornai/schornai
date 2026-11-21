"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "next-i18next/client";
import { useRecordingWakeLock } from "./useRecordingWakeLock";
import { voiceWaveformBars } from "@schornio/aibox-package-database/chat/voiceMessage";

function summarizeWaveform(readings: number[]) {
  const count = Math.min(voiceWaveformBars, readings.length);
  return Array.from({ length: count }, (_, i) => {
    const start = Math.floor((i * readings.length) / count);
    const end = Math.floor(((i + 1) * readings.length) / count);
    let peak = 0;
    for (let j = start; j < end; j++) peak = Math.max(peak, readings[j] ?? 0);
    return Math.round(peak * 100) / 100;
  });
}
type Phase =
  | "idle"
  | "requesting"
  | "recording"
  | "stopping"
  | "ready"
  | "uploading"
  | "saved";

export function useAudioRecording({
  maxSeconds,
  onSave,
  onFinished,
  onCloseBlockedChange,
}: {
  maxSeconds?: number;
  onSave: (file: File, duration: number, peaks: number[]) => Promise<void>;
  onFinished?: () => void;
  onCloseBlockedChange?: (blocked: boolean) => void;
}) {
  const { t } = useT("transcriber", { keyPrefix: "_components.AudioRecorder" });
  const [phase, setPhase] = useState<Phase>("idle");
  const wakeLock = useRecordingWakeLock(phase === "recording");
  useEffect(() => {
    onCloseBlockedChange?.(
      phase === "recording" ||
        phase === "stopping" ||
        phase === "uploading" ||
        phase === "requesting" ||
        phase === "ready",
    );
  }, [phase, onCloseBlockedChange]);
  const [error, setError] = useState<string>();
  const [clip, setClip] = useState<{
    file: File;
    url: string;
    duration: number;
  }>();
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder>(null);
  const stream = useRef<MediaStream>(null);
  const previewUrl = useRef<string>(null);
  const attempt = useRef(0);
  const phaseBeforeRequest = useRef<Phase>("idle");
  const mounted = useRef(false);
  const samplesByTime = useRef<number[]>([]);
  const [peaks, setPeaks] = useState<number[]>([]);
  const startedAt = useRef(0);
  const orb = useRef<HTMLDivElement>(null);

  const releaseMicrophone = () => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  };
  const clearPreview = () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    setClip(undefined);
  };
  useEffect(() => {
    const requestCounter = attempt;
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestCounter.current++;
      if (recorder.current?.state !== "inactive") recorder.current?.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    };
  }, []);
  useEffect(() => {
    if (phase !== "recording") return;
    const deadline = maxSeconds
      ? setTimeout(
          () => {
            if (recorder.current?.state === "recording") {
              setPhase("stopping");
              recorder.current.stop();
            }
          },
          Math.max(0, maxSeconds * 1000 - (Date.now() - startedAt.current)),
        )
      : undefined;
    const timer = setInterval(
      () => setSeconds(Math.floor((Date.now() - startedAt.current) / 1000)),
      1000,
    );
    return () => {
      clearInterval(timer);
      clearTimeout(deadline);
    };
  }, [phase, maxSeconds]);
  useEffect(() => {
    const element = orb.current;
    element?.style.setProperty("--audio-level", "0");
    if (phase !== "recording" || !stream.current) return;
    // Analyse the same microphone stream without connecting it to the speakers.
    // Metering is optional: recording still works if Web Audio is unavailable.
    const AudioContextClass =
      window.AudioContext ??
      (
        window as Window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (!AudioContextClass) return;
    let context: AudioContext | undefined;
    let source: MediaStreamAudioSourceNode | undefined;
    let analyser: AnalyserNode | undefined;
    let frame = 0;
    const dispose = () => {
      cancelAnimationFrame(frame);
      source?.disconnect();
      analyser?.disconnect();
      if (context && context.state !== "closed")
        void context.close().catch(() => {});
      element?.style.setProperty("--audio-level", "0");
    };
    try {
      context = new AudioContextClass();
      source = context.createMediaStreamSource(stream.current);
      analyser = context.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      void context.resume().catch(() => {});
      const samples = new Float32Array(analyser.fftSize);
      const meter = analyser;
      let level = 0;
      let previousTime = performance.now();
      const draw = (time: number) => {
        meter.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(
          samples.reduce((sum, sample) => sum + sample * sample, 0) /
            samples.length,
        );
        const target = Math.min(
          1,
          Math.pow(Math.max(0, rms - 0.008) * 5, 0.65),
        );
        if (maxSeconds) {
          // One peak per 100 ms, reduced to the same bars for preview and history.
          const index = Math.min(
            maxSeconds * 10 - 1,
            Math.floor((Date.now() - startedAt.current) / 100),
          );
          const readings = samplesByTime.current;
          const isNew = index >= readings.length;
          readings[index] = Math.max(readings[index] ?? 0, target);
          if (isNew) setPeaks(summarizeWaveform(readings));
        }
        // Fast attack and soft release for the file recorder’s level meter.
        const elapsed = Math.max(0, Math.min(time - previousTime, 100));
        level +=
          (target - level) *
          (1 - Math.exp(-elapsed / (target > level ? 55 : 220)));
        previousTime = time;
        element?.style.setProperty("--audio-level", level.toFixed(3));
        frame = requestAnimationFrame(draw);
      };
      frame = requestAnimationFrame(draw);
    } catch {
      dispose();
      return;
    }
    return dispose;
  }, [phase, maxSeconds]);
  useEffect(() => {
    if (
      phase !== "recording" &&
      phase !== "stopping" &&
      !(clip && phase !== "saved")
    )
      return;
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [clip, phase]);

  const start = async () => {
    if (phase !== "ready" && phase !== "idle" && phase !== "saved") return;
    setError(undefined);
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError(t("errorUnsupported"));
      return;
    }
    const ticket = ++attempt.current;
    phaseBeforeRequest.current = phase;
    setPhase("requesting");
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      if (!mounted.current || ticket !== attempt.current) {
        audioStream.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = audioStream;
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/webm",
        "audio/ogg",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const recording = new MediaRecorder(
        audioStream,
        mimeType ? { mimeType } : undefined,
      );
      recorder.current = recording;
      const chunks: Blob[] = [];
      let failed = false;
      recording.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recording.onerror = () => {
        if (!mounted.current || ticket !== attempt.current) return;
        failed = true;
        releaseMicrophone();
        if (mounted.current && ticket === attempt.current) {
          setError(t("errorRecording"));
          setPhase("idle");
        }
      };
      recording.onstop = () => {
        if (!mounted.current || ticket !== attempt.current) return;
        releaseMicrophone();
        if (failed) return;
        const type =
          recording.mimeType || chunks[0]?.type || mimeType || "audio/webm";
        const blob = new Blob(chunks, { type });
        if (blob.size === 0) {
          setError(t("errorEmpty"));
          setPhase("idle");
          return;
        }
        const extension = type.includes("mp4")
          ? "m4a"
          : type.includes("ogg")
            ? "ogg"
            : "webm";
        const filename = `recording-${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
        const file = new File([blob], filename, { type });
        const url = URL.createObjectURL(blob);
        previewUrl.current = url;
        const elapsed = Math.max(
          0.001,
          (Date.now() - startedAt.current) / 1000,
        );
        const duration = Math.min(elapsed, maxSeconds ?? Infinity);
        if (maxSeconds) setPeaks(summarizeWaveform(samplesByTime.current));
        setSeconds(Math.floor(duration));
        setClip({ file, url, duration });
        setPhase("ready");
      };
      recording.start(1000);
      samplesByTime.current = [];
      setPeaks([]);
      clearPreview();
      startedAt.current = Date.now();
      setSeconds(0);
      setPhase("recording");
    } catch (cause) {
      if (!mounted.current || ticket !== attempt.current) return;
      releaseMicrophone();
      setError(
        t(
          cause instanceof DOMException && cause.name === "NotAllowedError"
            ? "errorPermission"
            : "errorRecording",
        ),
      );
      setPhase(phaseBeforeRequest.current);
    }
  };
  const cancelRequest = () => {
    attempt.current++;
    setError(undefined);
    setPhase(phaseBeforeRequest.current);
  };
  const stop = () => {
    if (recorder.current?.state !== "recording") return;
    setPhase("stopping");
    recorder.current?.stop();
  };
  const discard = () => {
    attempt.current++;
    clearPreview();
    setError(undefined);
    setSeconds(0);
    setPhase("idle");
    onFinished?.();
  };
  const upload = async () => {
    if (!clip || phase !== "ready") return;
    setPhase("uploading");
    setError(undefined);
    try {
      await onSave(clip.file, clip.duration, peaks);
      if (!mounted.current) return;
      setPhase("saved");
      onFinished?.();
    } catch {
      if (!mounted.current) return;
      setError(t("errorUpload"));
      setPhase("ready");
    }
  };
  const duration = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  return {
    phase,
    wakeLock,
    error,
    clip,
    seconds,
    peaks,
    orb,
    duration,
    start,
    stop,
    cancelRequest,
    discard,
    upload,
  };
}
