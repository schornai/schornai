"use client";

import { Pause, Play, Pencil } from "lucide-react";
import { useT } from "next-i18next/client";
import { TranscriptionControlButton } from "./TranscriptionControlButton";
import { Badge } from "@schornio/aibox-package-ui/components/badge";
import type { StorageFileContent } from "@schornio/aibox-package-database/storage/_types";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { useMediaPlayerContext } from "./MediaPlayerContext";
import { formatTime } from "./formatTime";

export function TranscriptionSegment({
  segment,
  segmentIndex,
  editor,
  onEdit,
  editingDisabled,
}: {
  segment: NonNullable<
    Extract<StorageFileContent, { type: "transcript" }>["segments"]
  >[number];
  segmentIndex: number;
  editor?: React.ReactNode;
  onEdit?: () => void;
  editingDisabled?: boolean;
}) {
  const { t, i18n } = useT("common", {
    keyPrefix: "_components.Transcription",
  });
  const { currentTime, isPlaying, setCurrentTime, pause, playUntil } =
    useMediaPlayerContext();
  const active =
    currentTime >= segment.timeStart && currentTime < segment.timeEnd;
  return (
    <div
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex min-w-0 scroll-m-6 items-start gap-3 rounded-lg border border-transparent p-3 sm:gap-4 sm:p-4",
        { "border-border bg-muted/60": active },
      )}
    >
      <TranscriptionControlButton
        size="icon"
        variant={active && isPlaying ? "default" : "ghost"}
        aria-label={t(active && isPlaying ? "labelPause" : "labelPlaySegment", {
          number: segmentIndex + 1,
        })}
        onClick={() => {
          if (active && isPlaying) pause();
          else {
            setCurrentTime(segment.timeStart);
            playUntil(segment.timeEnd);
          }
        }}
      >
        {active && isPlaying ? <Pause /> : <Play />}
      </TranscriptionControlButton>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs tabular-nums">
          <span>
            {formatTime(segment.timeStart, i18n.language)} –{" "}
            {formatTime(segment.timeEnd, i18n.language)}
          </span>
          {onEdit && !editor && (
            <TranscriptionControlButton
              size="icon-sm"
              variant="ghost"
              aria-label={t("labelEditSegment", { number: segmentIndex + 1 })}
              disabled={editingDisabled}
              onClick={onEdit}
            >
              <Pencil />
            </TranscriptionControlButton>
          )}
          {segment.reviewed && (
            <Badge variant="secondary">{t("labelReviewed")}</Badge>
          )}
        </div>
        {editor ?? (
          <p className="text-sm leading-7 wrap-anywhere whitespace-pre-wrap sm:text-base">
            {segment.segmentOverride !== undefined
              ? segment.segmentOverride
              : segment.words.map((word, index) => (
                  <span
                    key={index}
                    title={t("descriptionConfidence", {
                      percent: Math.round(word.probability * 100),
                    })}
                    className={cn({
                      "underline decoration-dotted underline-offset-4":
                        !segment.reviewed && word.probability < 0.85,
                      "bg-primary/10 rounded-sm":
                        active &&
                        currentTime >= word.timeStart &&
                        currentTime < word.timeEnd,
                    })}
                  >
                    {word.wordOverride ?? word.word}
                  </span>
                ))}
          </p>
        )}
      </div>
    </div>
  );
}
