"use client";

import type {
  Storage,
  StorageFileContent,
  StorageObject,
} from "@schornio/aibox-package-database/storage/_types";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { buttonVariants } from "@schornio/aibox-package-ui/components/button";
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { storageUpdateTranscriptionSegment } from "../../_actions/storageUpdateTranscriptionSegment";
import { TranscriptionSegmentEditor } from "./TranscriptionSegmentEditor";
import {
  segmentText,
  transcriptionToSrt,
  type TranscriptionSegmentData,
} from "./transcriptionText";
import { useT } from "next-i18next/client";
import { MediaPlayer } from "./MediaPlayer";
import { MediaPlayerContext } from "./MediaPlayerContext";
import { StorageSession } from "@schornio/aibox-package-database/storage/_utils/StorageSession";
import { TranscriptionSegment } from "./TranscriptionSegment";

export function StorageFilePreviewTranscription({
  fileContent: transcription,
  fileObject,
  storage,
}: {
  fileContent: Extract<StorageFileContent, { type: "transcript" }>;
  fileObject: StorageObject;
  storage: Storage;
}) {
  const { t } = useT("common", { keyPrefix: "_components.Transcription" });
  const [saved, setSaved] = useState<{
    source: typeof transcription;
    segments: TranscriptionSegmentData[];
  }>();
  const segments =
    (saved?.source === transcription
      ? saved.segments
      : transcription.segments) ?? [];
  const [editing, setEditing] = useState<number | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string>();
  const srt = transcriptionToSrt(segments);
  useEffect(() => {
    if (!srt) {
      setDownloadUrl(undefined);
      return;
    }
    const url = URL.createObjectURL(
      new Blob([srt], { type: "application/x-subrip;charset=utf-8" }),
    );
    setDownloadUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [srt]);
  const save = async (
    index: number,
    expected: TranscriptionSegmentData,
    text: string | null,
    reviewed: boolean,
  ) => {
    const result = await storageUpdateTranscriptionSegment({
      storage,
      path: fileObject.path,
      segmentIndex: index,
      expectedSegment: expected,
      text,
      reviewed,
    });
    if (result?.data?.status === "conflict") return "errorConflict" as const;
    if (result?.data?.status !== "saved") return "errorSave" as const;
    setSaved({
      source: transcription,
      segments: result.data.transcription.segments,
    });
    setEditing(null);
    return undefined;
  };
  const filePath = `/api/storage/${StorageSession.getStorageName(storage.type)}/${StorageSession.getStoragePath(fileObject.path, storage).storagePath}`;
  const words = segments.reduce(
    (total, segment) =>
      total + segmentText(segment).trim().split(/\s+/u).filter(Boolean).length,
    0,
  );
  const reviewed = segments.length
    ? Math.round(
        (segments.filter((segment) => segment.reviewed).length /
          segments.length) *
          100,
      )
    : 0;
  return (
    <ContainerMain className="max-w-5xl py-6">
      <MediaPlayerContext key={filePath} filePath={filePath}>
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">{t("labelTitle")}</h2>
            <div className="flex min-w-0 items-center gap-2">
              <p className="text-muted-foreground truncate text-sm">
                {fileObject.name}
              </p>
              {downloadUrl &&
              editing === null &&
              transcription.textOverride === undefined ? (
                <a
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                  href={downloadUrl}
                  download={`${fileObject.name.replace(/\.[^.]+$/, "")}.srt`}
                >
                  <Download data-icon="inline-start" />
                  {t("labelDownloadSrt")}
                </a>
              ) : null}
            </div>
            {editing !== null ? (
              <p className="text-muted-foreground text-xs">
                {t("descriptionSaveBeforeDownload")}
              </p>
            ) : null}
          </header>
          <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-34 lg:col-start-2 lg:row-start-1">
              <MediaPlayer filePath={filePath} />
              <dl className="text-muted-foreground flex flex-wrap justify-between gap-3 px-1 text-xs">
                <div>
                  <dt>{t("labelSegments")}</dt>
                  <dd className="text-foreground mt-1 font-medium tabular-nums">
                    {segments.length}
                  </dd>
                </div>
                <div>
                  <dt>{t("labelWords")}</dt>
                  <dd className="text-foreground mt-1 font-medium tabular-nums">
                    {words}
                  </dd>
                </div>
                <div>
                  <dt>{t("labelReviewed")}</dt>
                  <dd className="text-foreground mt-1 font-medium tabular-nums">
                    {reviewed} %
                  </dd>
                </div>
              </dl>
            </aside>
            <section
              className="flex min-w-0 flex-col gap-3 lg:col-start-1 lg:row-start-1"
              aria-label={t("labelTitle")}
            >
              {transcription.textOverride !== undefined ? (
                <pre className="font-mono whitespace-pre-wrap">
                  {transcription.textOverride}
                </pre>
              ) : segments.length ? (
                <div className="flex flex-col gap-1">
                  {segments.map((segment, index) => (
                    <TranscriptionSegment
                      key={index}
                      segment={segment}
                      segmentIndex={index}
                      onEdit={() => setEditing(index)}
                      editingDisabled={editing !== null}
                      editor={
                        editing === index ? (
                          <TranscriptionSegmentEditor
                            segment={segment}
                            onCancel={() => setEditing(null)}
                            onSave={(expected, text, reviewed) =>
                              save(index, expected, text, reviewed)
                            }
                          />
                        ) : undefined
                      }
                    />
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertDescription>{t("descriptionEmpty")}</AlertDescription>
                </Alert>
              )}
            </section>
          </div>
        </div>
      </MediaPlayerContext>
    </ContainerMain>
  );
}
