"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@schornio/aibox-package-ui/components/dropdown-menu";
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { TranscriptionControlButton } from "./TranscriptionControlButton";
import { Slider } from "@schornio/aibox-package-ui/components/slider";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import {
  LoaderCircle,
  PanelBottomClose,
  PanelBottomOpen,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useId, useState } from "react";
import { useT } from "next-i18next/client";
import { useMediaPlayerContext } from "./MediaPlayerContext";
import { formatTime } from "./formatTime";

export function MediaPlayer({
  filePath,
  embedded = false,
  mediaLabel,
}: {
  filePath?: string;
  embedded?: boolean;
  mediaLabel?: string;
}) {
  const { t, i18n } = useT("common", {
    keyPrefix: "_components.Transcription",
  });
  const {
    currentTime,
    duration,
    hasVideo,
    isPlaying,
    pause,
    play,
    videoRef,
    volume,
    rate,
    setCurrentTime,
    setVolume,
    setRate,
    error,
    loading,
  } = useMediaPlayerContext();
  const [seekPreview, setSeekPreview] = useState<number | null>(null);
  const seekLabelId = useId();
  const volumeLabelId = useId();
  const [videoVisible, setVideoVisible] = useState(true);
  const [previousVolume, setPreviousVolume] = useState(1);
  return (
    <section
      aria-label={t("labelPlayer")}
      className={cn("flex min-w-0 flex-col gap-3", {
        "bg-background rounded-xl border p-4 shadow-sm": !embedded,
      })}
    >
      <video
        aria-label={mediaLabel}
        ref={videoRef}
        src={filePath}
        preload="metadata"
        playsInline
        className={cn(
          "bg-muted aspect-video max-h-72 w-full rounded-lg object-contain",
          { hidden: !hasVideo || !videoVisible },
        )}
      />
      {loading && !error && (
        <div
          role="status"
          className="text-muted-foreground flex items-center gap-2 text-sm"
        >
          <LoaderCircle
            aria-hidden="true"
            className="size-4 shrink-0 animate-spin"
          />
          {t(
            loading === "seeking"
              ? "labelSeeking"
              : loading === "buffering"
                ? "labelBuffering"
                : "labelLoadingMedia",
          )}
        </div>
      )}
      <div className="flex items-center gap-3">
        <TranscriptionControlButton
          size="icon"
          disabled={!filePath}
          onClick={isPlaying ? pause : play}
          aria-label={t(isPlaying ? "labelPause" : "labelPlay")}
        >
          <>{isPlaying ? <Pause /> : <Play />}</>
        </TranscriptionControlButton>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span id={seekLabelId} className="sr-only">
            {t("labelSeek")}
          </span>
          <Slider
            aria-labelledby={seekLabelId}
            min={0}
            max={duration || 1}
            step={0.1}
            value={[Math.min(seekPreview ?? currentTime, duration)]}
            disabled={!duration}
            onValueChange={(value) =>
              setSeekPreview(Array.isArray(value) ? (value[0] ?? 0) : value)
            }
            onValueCommitted={(value) => {
              setCurrentTime(Array.isArray(value) ? (value[0] ?? 0) : value);
              setSeekPreview(null);
            }}
          />
          <div className="text-muted-foreground flex justify-between text-xs tabular-nums">
            <span>{formatTime(seekPreview ?? currentTime, i18n.language)}</span>
            <span>{formatTime(duration, i18n.language)}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <TranscriptionControlButton
            size="icon"
            variant="ghost"
            disabled={!duration}
            aria-label={t("labelBack")}
            onClick={() => setCurrentTime(currentTime - 10)}
          >
            <RotateCcw />
          </TranscriptionControlButton>
          <TranscriptionControlButton
            size="icon"
            variant="ghost"
            disabled={!duration}
            aria-label={t("labelForward")}
            onClick={() => setCurrentTime(currentTime + 10)}
          >
            <RotateCw />
          </TranscriptionControlButton>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <TranscriptionControlButton
                  variant="ghost"
                  size="sm"
                  aria-label={t("labelSpeed")}
                >
                  {rate}×
                </TranscriptionControlButton>
              }
            />
            <DropdownMenuContent>
              <DropdownMenuRadioGroup
                value={String(rate)}
                onValueChange={(value) => setRate(Number(value))}
              >
                {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((value) => (
                  <DropdownMenuRadioItem key={value} value={String(value)}>
                    {value}×
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-2">
          <TranscriptionControlButton
            size="icon"
            variant="ghost"
            aria-label={t(volume === 0 ? "labelUnmute" : "labelMute")}
            onClick={() => {
              if (volume > 0) {
                setPreviousVolume(volume);
                setVolume(0);
              } else setVolume(previousVolume);
            }}
          >
            {volume === 0 ? <VolumeX /> : <Volume2 />}
          </TranscriptionControlButton>
          <div className="w-20">
            <span id={volumeLabelId} className="sr-only">
              {t("labelVolume")}
            </span>
            <Slider
              aria-labelledby={volumeLabelId}
              min={0}
              max={1}
              step={0.01}
              value={[volume]}
              onValueChange={(value) =>
                setVolume(Array.isArray(value) ? (value[0] ?? 0) : value)
              }
            />
          </div>
          {hasVideo && (
            <TranscriptionControlButton
              size="icon"
              variant="ghost"
              aria-label={t(videoVisible ? "labelHideVideo" : "labelShowVideo")}
              onClick={() => setVideoVisible(!videoVisible)}
            >
              {videoVisible ? <PanelBottomClose /> : <PanelBottomOpen />}
            </TranscriptionControlButton>
          )}
        </div>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{t("errorPlayback")}</AlertDescription>
        </Alert>
      )}
    </section>
  );
}
