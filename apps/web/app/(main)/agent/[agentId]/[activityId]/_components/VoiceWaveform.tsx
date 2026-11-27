import type { AppColor } from "@schornio/aibox-package-database/_shared/_types";
import { voiceWaveformBars } from "@schornio/aibox-package-database/chat/voiceMessage";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import { cn } from "@schornio/aibox-package-ui/lib/utils";

export function VoiceWaveform({
  agentColor,
  samples,
  progress = 0,
  transcribing = false,
}: {
  agentColor?: AppColor;
  samples: number[];
  progress?: number;
  transcribing?: boolean;
}) {
  return (
    <ContainerStyled
      appColor={agentColor}
      aria-hidden="true"
      className={cn(
        "text-primary flex h-11 w-full min-w-0 items-center gap-px bg-transparent backdrop-blur-none dark:bg-transparent",
        agentColor && "text-(--color-dark) dark:text-(--color-light)",
        transcribing && "text-muted-foreground dark:text-muted-foreground",
      )}
    >
      {Array.from({ length: voiceWaveformBars }, (_, i) => {
        const sample =
          samples[Math.floor((i * samples.length) / voiceWaveformBars)] ?? 0;
        return (
          <span
            key={i}
            className={cn(
              "min-w-0 flex-1 rounded-full bg-current",
              progress > 0 && i / voiceWaveformBars >= progress && "opacity-45",
              transcribing && "motion-safe:animate-pulse",
            )}
            style={{
              height: 3 + sample * 33,
              animationDelay: transcribing
                ? `${-40 * (voiceWaveformBars - i)}ms`
                : undefined,
            }}
          />
        );
      })}
    </ContainerStyled>
  );
}
