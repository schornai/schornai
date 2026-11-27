"use client";
import { Mic, SendHorizontal, X } from "lucide-react";
import { voiceTranscriberErrorKeys } from "@/lib/voiceTranscriberStatus";
import { useEffect, useEffectEvent, useRef } from "react";
import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import { storageRemove } from "../../../../../_actions/storageRemove";
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
  const uploaded = useRef<{ file: File; path: string; rejected: boolean }>(
    null,
  );
  const discard = useAction(storageRemove, { onSuccess: onClose });
  const recording = useAudioRecording({
    maxSeconds: maxVoiceSeconds,
    onFinished: onClose,
    onSave: async (file, duration, peaks) => {
      if (uploaded.current?.file !== file) {
        const [upload] = await queueFileUploadsByFiles([file]);
        if (upload?.state !== "success") throw new Error("UPLOAD_FAILED");
        uploaded.current = { file, path: upload.path, rejected: false };
      }
      uploaded.current.rejected = false;
      const result = await executeAsync({
        agentId,
        activityId,
        thinking,
        voice: { path: uploaded.current.path, duration, peaks },
      });
      if (!result?.data?.queued) {
        uploaded.current.rejected =
          result?.data?.queued === false || Boolean(result?.validationErrors);
        throw new Error("SUBMISSION_FAILED");
      }
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
  const unconfirmed = Boolean(
    recording.error && uploaded.current && !uploaded.current.rejected,
  );
  const discardLabel = t(unconfirmed ? "labelClose" : "labelDiscard");
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
        <ButtonAction
          type="button"
          variant="destructive"
          size="icon-lg"
          className="size-11 rounded-full"
          disabled={submitting}
          isPending={discard.isPending}
          hasErrored={discard.hasErrored}
          indicator="replace"
          aria-label={discardLabel}
          title={discardLabel}
          onClick={() => {
            const upload = uploaded.current;
            if (upload?.rejected) {
              discard.execute({
                storage: { type: "activity", agentId, activityId },
                path: upload.path,
              });
            } else onClose();
          }}
        >
          <X />
        </ButtonAction>
        <ButtonAction
          type="button"
          size="icon-lg"
          className="size-11 rounded-full"
          indicator="replace"
          aria-label={actionLabel}
          title={actionLabel}
          disabled={phase === "saved" || discard.isPending}
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
      {discard.hasErrored && (
        <p role="alert" className="text-destructive px-4 pb-2 text-xs">
          {t("errorDiscard")}
        </p>
      )}
      {recording.error && (
        <p className="text-destructive px-4 pb-2 text-xs" role="alert">
          {submission.data?.issue
            ? t(voiceTranscriberErrorKeys[submission.data.issue])
            : unconfirmed
              ? t("errorUnconfirmed")
              : hasErrored || submission.data?.queued === false
                ? t("errorSend")
                : recording.error}
        </p>
      )}
    </section>
  );
}
