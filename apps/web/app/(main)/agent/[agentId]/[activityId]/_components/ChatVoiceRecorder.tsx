"use client";
import { Mic, SendHorizontal, X } from "lucide-react";
import { voiceTranscriberErrorKeys } from "@/lib/voiceTranscriberStatus";
import { useEffect, useEffectEvent, useRef } from "react";
import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { maxVoiceSeconds } from "@schornio/aibox-package-database/chat/voiceMessage";
import { StorageSession } from "@schornio/aibox-package-database/storage/_utils/StorageSession";
import { useAudioRecording } from "../../../../../_components/useAudioRecording";
import {
  FileUploadProvider,
  useFileUpload,
} from "../../../../../_components/FileUploadProvider";
import { VoiceWaveform } from "./VoiceWaveform";
import type { AppColor } from "@schornio/aibox-package-database/_shared/_types";
import { submitVoiceMessage } from "../_actions/submitVoiceMessage";

type Props = {
  agentId: string;
  activityId: string;
  thinking?: boolean;
  agentColor?: AppColor;
  autoStart?: boolean;
  onClose: () => void;
};
export function ChatVoiceRecorder(props: Props) {
  const storage = {
    type: "activity" as const,
    agentId: props.agentId,
    activityId: props.activityId,
  };
  // Voice uploads have their own destination lifecycle. Ordinary uploads attach to the text draft.
  return (
    <FileUploadProvider
      basePath="/"
      bucketName={StorageSession.getStorageName(storage.type)}
      bucketPath={StorageSession.getStoragePath("/", storage).storagePath}
      upsert={false}
    >
      <Recorder {...props} />
    </FileUploadProvider>
  );
}

function Recorder({
  agentId,
  activityId,
  thinking,
  onClose,
  agentColor,
  autoStart = true,
}: Props) {
  const { t } = useT("agent", { keyPrefix: "_components.VoiceMessage" });
  const { queueFileUploadsByFiles } = useFileUpload();
  const {
    executeAsync,
    hasErrored,
    result: submission,
  } = useAction(submitVoiceMessage);
  const uploaded = useRef<{ file: File; path: string }>(null);
  const recording = useAudioRecording({
    maxSeconds: maxVoiceSeconds,
    onFinished: onClose,
    onSave: async (file, duration, peaks) => {
      if (uploaded.current?.file !== file) {
        const [upload] = await queueFileUploadsByFiles([file]);
        if (upload?.state !== "success") throw new Error("UPLOAD_FAILED");
        uploaded.current = { file, path: upload.path };
      }
      const result = await executeAsync({
        agentId,
        activityId,
        thinking,
        voice: { path: uploaded.current.path, duration, peaks },
      });
      if (!result?.data?.queued) throw new Error("SUBMISSION_FAILED");
    },
  });
  const startRecording = useEffectEvent(recording.start);
  useEffect(() => {
    if (!autoStart) return;
    // Skip the discarded mount when React checks effects in Strict Mode.
    let active = true;
    queueMicrotask(() => {
      if (active) void startRecording();
    });
    return () => {
      active = false;
    };
  }, [autoStart]);
  const { phase, clip } = recording;
  const canStart = phase === "idle";
  const submitting = phase === "uploading" || phase === "stopping";
  const actionLabel = t(canStart ? "labelRecord" : "labelSend");
  return (
    <section
      data-slot="chat-voice-recorder"
      aria-label={t("labelTitle")}
      className="bg-muted rounded-[1.75rem] p-1.5"
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <div className="min-w-0 flex-1 px-3">
          <VoiceWaveform agentColor={agentColor} samples={recording.spectrum} />
        </div>
        <Button
          type="button"
          variant="destructive"
          size="icon-lg"
          className="size-11 rounded-full"
          disabled={submitting}
          aria-label={t("labelDiscard")}
          title={t("labelDiscard")}
          onClick={onClose}
        >
          <X />
        </Button>
        <ButtonAction
          type="button"
          size="icon-lg"
          className="size-11 rounded-full"
          indicator="replace"
          aria-label={actionLabel}
          title={actionLabel}
          disabled={phase === "saved"}
          isPending={phase === "requesting" || submitting}
          onClick={() =>
            canStart ? void recording.start() : void recording.upload()
          }
        >
          {canStart ? <Mic /> : <SendHorizontal />}
        </ButtonAction>
      </div>
      <span role="status" className="sr-only">
        {phase === "recording"
          ? t("labelRecording")
          : phase === "uploading"
            ? t("labelUploading")
            : clip
              ? t("labelRecorded")
              : null}
      </span>
      {recording.error && (
        <p className="text-destructive px-4 pb-2 text-xs" role="alert">
          {submission.data?.issue
            ? t(voiceTranscriberErrorKeys[submission.data.issue])
            : hasErrored
              ? t("errorSend")
              : recording.error}
        </p>
      )}
    </section>
  );
}
