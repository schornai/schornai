"use client";

import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { AudioLines, FileAudio, Mic, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AppColor } from "@schornio/aibox-package-database/_shared/_types";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { MediaPlayer } from "./transcription/MediaPlayer";
import { MediaPlayerContext } from "./transcription/MediaPlayerContext";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { useRecordingWakeLock } from "./useRecordingWakeLock";
import { useFileUpload } from "./FileUploadProvider";
import { useT } from "next-i18next/client";

type Phase =
  | "idle"
  | "requesting"
  | "recording"
  | "stopping"
  | "ready"
  | "uploading"
  | "saved";

export function AudioRecorder({
  appColor,
  onCloseBlockedChange,
  closeControl,
  onFinished,
}: {
  appColor?: AppColor;
  closeControl?: ReactNode;
  onFinished?: () => void;
  onCloseBlockedChange?: (blocked: boolean) => void;
}) {
  const { t } = useT("transcriber", { keyPrefix: "_components.AudioRecorder" });
  const { queueFileUploadsByFiles } = useFileUpload();
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
    const timer = setInterval(
      () => setSeconds(Math.floor((Date.now() - startedAt.current) / 1000)),
      1000,
    );
    return () => {
      clearInterval(timer);
    };
  }, [phase]);
  useEffect(() => {
    const element = orb.current;
    element?.style.setProperty("--audio-level", "0");
    if (phase !== "recording" || !stream.current || !element) return;
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
      element.style.setProperty("--audio-level", "0");
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
        // Fast attack, soft release; update only the orb, without React renders.
        const elapsed = Math.max(0, Math.min(time - previousTime, 100));
        level +=
          (target - level) *
          (1 - Math.exp(-elapsed / (target > level ? 55 : 220)));
        previousTime = time;
        element.style.setProperty("--audio-level", level.toFixed(3));
        frame = requestAnimationFrame(draw);
      };
      frame = requestAnimationFrame(draw);
    } catch {
      dispose();
      return;
    }
    return dispose;
  }, [phase]);
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
        const duration = Math.max(0, (Date.now() - startedAt.current) / 1000);
        setSeconds(Math.floor(duration));
        setClip({ file, url, duration });
        setPhase("ready");
      };
      recording.start(1000);
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
    if (!clip) return;
    setPhase("uploading");
    setError(undefined);
    try {
      const uploads = await queueFileUploadsByFiles([clip.file]);
      if (!mounted.current) return;
      if (uploads.length !== 1 || uploads[0]?.state !== "success")
        throw new Error("UPLOAD_FAILED");
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
  const orbColor =
    appColor?.type === "color-oklch-hue"
      ? `oklch(70% 0.15 ${appColor.oklchHue})`
      : appColor?.type === "color-rgb"
        ? `rgb(${appColor.red} ${appColor.green} ${appColor.blue})`
        : "var(--primary)";
  const status = {
    idle: "labelReady",
    ready: "labelRecorded",
    recording: "labelRecording",
    requesting: "labelRequesting",
    saved: "labelSaved",
    stopping: "labelStopping",
    uploading: "labelUploading",
  }[phase];
  return (
    <>
      <section
        className="bg-background overflow-hidden"
        aria-label={t("labelTitle")}
      >
        <div
          className="bg-background text-foreground relative flex flex-col items-center overflow-hidden [background-image:linear-gradient(to_top,var(--background),transparent_40%),radial-gradient(ellipse_at_50%_34%,color-mix(in_oklab,var(--orb-color)_18%,transparent),transparent_56%),radial-gradient(ellipse_at_25%_90%,color-mix(in_oklab,var(--orb-color)_7%,transparent),transparent_55%)] px-5 pt-3 pb-4 text-center [--orb-bright:color-mix(in_oklab,var(--orb-color)_65%,white)] [--orb-deep:color-mix(in_oklab,var(--orb-color)_32%,var(--background))] [--orb-light:color-mix(in_oklab,var(--orb-color)_35%,white)]"
          style={{ "--orb-color": orbColor } as CSSProperties}
        >
          <div
            className={cn(
              "relative flex items-center justify-center",
              clip
                ? "h-28 [@media(max-height:650px)]:h-16"
                : "h-64 [@media(max-height:650px)]:h-40",
            )}
          >
            <div
              ref={orb}
              className={cn(
                "group/orb relative isolate grid size-64 shrink-0 place-items-center [--audio-level:0]",
                clip
                  ? "scale-50 [@media(max-height:650px)]:scale-[0.35]"
                  : "[@media(max-height:650px)]:scale-75",
              )}
              data-slot="recording-orb"
              data-active={phase === "recording"}
              data-busy={
                phase === "requesting" ||
                phase === "stopping" ||
                phase === "uploading"
              }
              aria-hidden="true"
            >
              <div className="group-data-[busy=true]/orb:animate-recording-orb-breathe absolute inset-[42px] [transform:scale(calc(1_+_var(--audio-level)_*_0.65))] rounded-full [opacity:calc(0.22_+_var(--audio-level)_*_0.5)] blur-[34px] [background:conic-gradient(from_60deg,var(--orb-bright),var(--orb-color),var(--orb-light),var(--orb-color),var(--orb-bright))] motion-reduce:[transform:none] motion-reduce:animate-none" />
              <div className="absolute inset-[17px] [transform:scale(calc(1_+_var(--audio-level)_*_0.12))] rounded-full border [border-color:color-mix(in_oklab,var(--orb-light)_6%,transparent)] [box-shadow:0_0_0_17px_color-mix(in_oklab,var(--orb-light)_2%,transparent)] motion-reduce:[transform:none]" />
              <div className="relative size-[158px] [transform:scale(calc(1_+_var(--audio-level)_*_0.24))] overflow-hidden rounded-full bg-(--orb-deep) [box-shadow:0_0_2px_1px_color-mix(in_oklab,var(--orb-bright)_50%,transparent),0_0_24px_color-mix(in_oklab,var(--orb-color)_20%,transparent),inset_0_0_24px_color-mix(in_oklab,var(--orb-light)_25%,transparent)] group-data-[active=true]/orb:[border-radius:calc(50%_-_var(--audio-level)_*_9%)_calc(50%_+_var(--audio-level)_*_7%)_calc(50%_-_var(--audio-level)_*_6%)_calc(50%_+_var(--audio-level)_*_8%)] motion-reduce:[transform:none] motion-reduce:rounded-full">
                <div className="animate-recording-orb-swirl absolute -inset-[24%] rounded-[44%] opacity-90 blur-[14px] [background:conic-gradient(from_30deg,var(--orb-bright),var(--orb-color)_20%,var(--orb-deep)_38%,var(--orb-color)_55%,var(--orb-light)_70%,var(--orb-color)_85%,var(--orb-bright))] group-data-[active=true]/orb:[animation-duration:7s] motion-reduce:animate-none" />
                <div className="animate-recording-orb-drift absolute -inset-x-[25%] inset-y-[12%] [transform:rotate(-35deg)_scaleY(calc(0.65_+_var(--audio-level)_*_0.35))] rounded-full border-[14px] border-(--orb-light) border-t-(--orb-bright) border-b-(--orb-color) blur-[5px] [background:radial-gradient(ellipse,color-mix(in_oklab,var(--orb-deep)_90%,transparent)_22%,color-mix(in_oklab,var(--orb-color)_50%,transparent)_58%,transparent_72%)] group-data-[active=true]/orb:[filter:blur(calc(5px_-_var(--audio-level)_*_2px))] motion-reduce:[transform:none] motion-reduce:animate-none" />
                <div className="animate-recording-orb-drift absolute inset-x-[18%] -inset-y-[24%] [transform:rotate(-35deg)_scaleY(calc(0.65_+_var(--audio-level)_*_0.35))] rounded-full border-[9px] [border-color:var(--orb-color)_var(--orb-bright)_var(--orb-light)_var(--orb-color)] opacity-65 blur-[5px] [animation-direction:alternate-reverse] [animation-duration:12s] [background:radial-gradient(ellipse,color-mix(in_oklab,var(--orb-deep)_90%,transparent)_22%,color-mix(in_oklab,var(--orb-color)_50%,transparent)_58%,transparent_72%)] motion-reduce:animate-none" />
                <div className="absolute inset-0 rounded-[inherit] [box-shadow:inset_0_0_14px_3px_color-mix(in_oklab,var(--orb-light)_30%,transparent)] [background:radial-gradient(ellipse_at_32%_18%,#ffffffa6,transparent_28%),radial-gradient(ellipse_at_50%_110%,color-mix(in_oklab,var(--background)_45%,transparent),transparent_62%)]" />
              </div>
            </div>
          </div>
          <div
            role={phase === "recording" ? "timer" : undefined}
            aria-label={t("labelDuration")}
            className="relative font-mono text-4xl font-light tracking-tight tabular-nums"
          >
            {duration}
          </div>
          <p role="status" className="relative mt-2 text-sm font-medium">
            {t(phase === "saved" ? "descriptionSaved" : status)}
          </p>
          {phase === "recording" && wakeLock !== "requesting" ? (
            <p
              className="text-muted-foreground relative mt-2 text-xs"
              role="status"
            >
              {t(
                wakeLock === "active"
                  ? "descriptionScreenAwake"
                  : "descriptionScreenSleep",
              )}
            </p>
          ) : null}
          {!clip || phase === "requesting" || phase === "recording" ? (
            <div className="relative mt-4 flex flex-wrap justify-center gap-2">
              {phase === "recording" ? (
                <Button variant="secondary" className="px-6" onClick={stop}>
                  <Square className="size-3 fill-current" />
                  {t("labelStop")}
                </Button>
              ) : !clip ? (
                <ButtonAction
                  className="px-6"
                  isPending={phase === "requesting" || phase === "stopping"}
                  onClick={() => {
                    void start();
                  }}
                >
                  <Mic />
                  {t("labelStart")}
                </ButtonAction>
              ) : undefined}
              {phase === "requesting" ? (
                <Button
                  variant="ghost"
                  className="px-5"
                  onClick={cancelRequest}
                >
                  {t("labelCancel")}
                </Button>
              ) : undefined}
            </div>
          ) : null}
        </div>
        {clip ? (
          <div className="flex flex-col gap-3 px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileAudio className="text-muted-foreground size-4" />
              {t("labelPreview")}
              <span className="text-muted-foreground ml-auto font-mono text-xs tabular-nums">
                {duration}
              </span>
            </div>
            <MediaPlayerContext
              key={clip.url}
              filePath={clip.url}
              durationHint={clip.duration}
            >
              <MediaPlayer
                filePath={clip.url}
                embedded
                mediaLabel={t("labelPreview")}
              />
            </MediaPlayerContext>
            <div className="flex flex-col gap-1">
              <ButtonAction
                className="w-full"
                disabled={
                  phase === "saved" ||
                  phase === "requesting" ||
                  phase === "stopping"
                }
                isPending={phase === "uploading"}
                hasSucceeded={phase === "saved"}
                onClick={() => {
                  void upload();
                }}
              >
                <AudioLines />
                {t("labelTranscribe")}
              </ButtonAction>
              <ButtonAction
                variant="ghost"
                className="w-full"
                isPending={phase === "requesting" || phase === "stopping"}
                disabled={phase === "uploading"}
                onClick={() => {
                  void start();
                }}
              >
                <Mic />
                {t("labelRecordAgain")}
              </ButtonAction>
              <Button
                variant="ghost"
                className="w-full"
                disabled={
                  phase === "uploading" ||
                  phase === "requesting" ||
                  phase === "stopping"
                }
                onClick={discard}
              >
                <Trash2 />
                {t("labelDiscard")}
              </Button>
            </div>
          </div>
        ) : undefined}
        {error ? (
          <div className="p-5">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ) : undefined}
        {closeControl && !clip ? (
          <div className="px-5 pb-3">{closeControl}</div>
        ) : null}
      </section>
    </>
  );
}
