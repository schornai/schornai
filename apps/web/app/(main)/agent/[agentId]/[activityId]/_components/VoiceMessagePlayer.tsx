"use client";
import { AudioLines, Pause, Play, RotateCcw } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { useT } from "next-i18next/client";
import {
  maxVoiceSeconds,
  voiceWaveformBars,
} from "@schornio/aibox-package-database/chat/voiceMessage";

function clock(seconds: number) {
  const whole = Math.floor(seconds);
  return Math.floor(whole / 60) + ":" + String(whole % 60).padStart(2, "0");
}

export function VoiceMessagePlayer({
  src,
  duration,
  peaks,
  control,
  status,
  transcript,
  live = false,
}: {
  src?: string;
  duration: number;
  peaks: number[];
  control?: ReactNode;
  status?: string;
  transcript?: string;
  live?: boolean;
}) {
  const { t } = useT("agent", { keyPrefix: "_components.VoiceMessage" });
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [error, setError] = useState(false);
  const play = () => {
    setError(false);
    void audio.current?.play().catch((e: unknown) => {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setError(true);
    });
  };
  return (
    <div
      className="flex w-full min-w-0 flex-col gap-2"
      aria-label={t("labelTitle")}
    >
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
        <AudioLines className="size-3.5" aria-hidden />
        {t("labelTitle")}
      </div>
      <div className="flex min-w-0 items-center gap-2">
        {control}
        {src && (
          <>
            <audio
              ref={audio}
              src={src}
              preload="none"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => {
                setPlaying(false);
                setPosition(0);
              }}
              onTimeUpdate={() => setPosition(audio.current?.currentTime ?? 0)}
              onError={() => setError(true)}
            />
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              aria-label={t(playing ? "labelPause" : "labelPlay")}
              title={t(playing ? "labelPause" : "labelPlay")}
              onClick={() => (playing ? audio.current?.pause() : play())}
            >
              {playing ? <Pause /> : <Play />}
            </Button>
          </>
        )}
        <div
          className="flex h-9 min-w-0 flex-1 items-center gap-px"
          aria-hidden="true"
        >
          {Array.from({ length: voiceWaveformBars }, (_, i) => {
            const sample = live
              ? peaks[i]
              : peaks[Math.floor((i * peaks.length) / voiceWaveformBars)];
            const active = live
              ? sample !== undefined
              : duration > 0 && i / voiceWaveformBars < position / duration;
            return (
              <span
                key={i}
                className={cn(
                  "bg-muted-foreground/40 min-w-0 flex-1 rounded-full",
                  active && "bg-primary",
                )}
                style={{ height: 2 + (sample ?? 0) * 32 + "px" }}
              />
            );
          })}
        </div>
        <span className="shrink-0 font-mono text-xs tabular-nums">
          {clock(playing || position > 0 ? position : duration)}
          {live ? " / " + clock(maxVoiceSeconds) : ""}
        </span>
        {src && (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            title={t("labelRestart")}
            aria-label={t("labelRestart")}
            onClick={() => {
              if (audio.current) audio.current.currentTime = 0;
              play();
            }}
          >
            <RotateCcw />
          </Button>
        )}
      </div>
      {status && (
        <p role="status" className="text-muted-foreground text-xs">
          {status}
        </p>
      )}
      {transcript && (
        <p className="border-border border-t pt-2 text-sm whitespace-pre-wrap">
          {transcript}
        </p>
      )}
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {t("errorPlayback")}
        </p>
      )}
    </div>
  );
}
