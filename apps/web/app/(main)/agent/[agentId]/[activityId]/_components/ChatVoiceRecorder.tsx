"use client";
import { Mic, SendHorizontal, Square, X } from "lucide-react";
import { useRef } from "react";
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
import { VoiceMessagePlayer } from "./VoiceMessagePlayer";
import { submitVoiceMessage } from "../_actions/submitVoiceMessage";

type Props = {
  agentId: string;
  activityId: string;
  thinking?: boolean;
  onClose: (sent: boolean) => void;
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

function Recorder({ agentId, activityId, thinking, onClose }: Props) {
  const { t } = useT("agent", { keyPrefix: "_components.VoiceMessage" });
  const { queueFileUploadsByFiles } = useFileUpload();
  const { executeAsync, hasErrored } = useAction(submitVoiceMessage);
  const uploaded = useRef<{ file: File; path: string }>(null);
  const recording = useAudioRecording({
    maxSeconds: maxVoiceSeconds,
    onFinished: () => onClose(true),
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
  const { phase, clip } = recording;
  const active = phase === "recording";
  const busy = phase === "uploading" || phase === "stopping";
  return (
    <section className="bg-background flex flex-col gap-3 rounded-lg p-3">
      <VoiceMessagePlayer
        key={clip?.url ?? "recorder"}
        src={clip?.url}
        duration={clip?.duration ?? recording.seconds}
        peaks={recording.peaks}
        live={!clip}
        status={t(
          active
            ? "labelRecording"
            : phase === "uploading"
              ? "labelUploading"
              : clip
                ? "descriptionPreview"
                : "descriptionStart",
        )}
        control={
          !clip && (
            <ButtonAction
              type="button"
              size="icon-sm"
              variant={active ? "destructive" : "default"}
              aria-label={t(active ? "labelStop" : "labelRecord")}
              title={t(active ? "labelStop" : "labelRecord")}
              isPending={phase === "requesting" || busy}
              onClick={() =>
                active ? recording.stop() : void recording.start()
              }
            >
              {active ? <Square /> : <Mic />}
            </ButtonAction>
          )
        }
      />
      {recording.error && (
        <p className="text-destructive text-xs" role="alert">
          {hasErrored ? t("errorSend") : recording.error}
        </p>
      )}
      <div className="flex items-center justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => onClose(false)}
        >
          <X />
          {t(clip || active ? "labelDiscard" : "labelCancel")}
        </Button>
        {clip && (
          <ButtonAction
            type="button"
            size="sm"
            isPending={busy}
            onClick={() => void recording.upload()}
          >
            <SendHorizontal />
            {t("labelSend")}
          </ButtonAction>
        )}
      </div>
    </section>
  );
}
