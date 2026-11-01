"use client";
import { useT } from "next-i18next/client";
import { useMediaPlayerContext } from "./MediaPlayerContext";
import { formatTime } from "./formatTime";
export function MediaPlayerDuration() {
  const { i18n } = useT("common");
  const { duration } = useMediaPlayerContext();
  return <>{formatTime(duration, i18n.language)}</>;
}
