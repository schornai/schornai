"use client";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@schornio/aibox-package-ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import type { AppColor } from "@schornio/aibox-package-database/_shared/_types";
import { useT } from "next-i18next/client";
import { VoiceWaveform } from "./VoiceWaveform";

export function VoiceMessagePlayer({
  src,
  duration,
  peaks,
  transcript,
  transcribing = false,
  agentColor,
}: {
  src: string;
  duration: number;
  peaks: number[];
  transcript?: string;
  transcribing?: boolean;
  agentColor?: AppColor;
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
    <Collapsible
      className="bg-muted w-full min-w-0 rounded-[1.75rem] p-1.5"
      aria-label={t("labelTitle")}
    >
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
      <div className="flex items-center gap-1.5">
        <CollapsibleTrigger
          className="focus-visible:ring-ring min-w-0 flex-1 cursor-pointer rounded-full px-3 outline-none focus-visible:ring-2"
          aria-label={t("labelToggleTranscript")}
          title={t("labelToggleTranscript")}
        >
          <VoiceWaveform
            agentColor={agentColor}
            samples={peaks}
            transcribing={transcribing}
            progress={duration > 0 ? position / duration : 0}
          />
        </CollapsibleTrigger>
        <Button
          type="button"
          size="icon-lg"
          className="size-11 rounded-full"
          variant="outline"
          title={t("labelRestart")}
          aria-label={t("labelRestart")}
          onClick={() => {
            if (audio.current) audio.current.currentTime = 0;
            play();
          }}
        >
          <RotateCcw />
        </Button>
        <Button
          type="button"
          size="icon-lg"
          className="size-11 rounded-full"
          aria-label={t(playing ? "labelPause" : "labelPlay")}
          title={t(playing ? "labelPause" : "labelPlay")}
          onClick={() => (playing ? audio.current?.pause() : play())}
        >
          {playing ? <Pause /> : <Play />}
        </Button>
      </div>
      <CollapsibleContent className="px-4 pt-1 pb-2 text-sm wrap-anywhere whitespace-pre-wrap">
        {transcript || (
          <span role="status" className="text-muted-foreground">
            {t(transcribing ? "labelTranscribing" : "labelAwaitingTranscript")}
          </span>
        )}
      </CollapsibleContent>
      {error && (
        <p role="alert" className="text-destructive px-4 pb-2 text-xs">
          {t("errorPlayback")}
        </p>
      )}
    </Collapsible>
  );
}
