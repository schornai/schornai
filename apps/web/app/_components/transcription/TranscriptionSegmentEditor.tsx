"use client";

import { useId, useState } from "react";
import { useT } from "next-i18next/client";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { Textarea } from "@schornio/aibox-package-ui/components/textarea";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@schornio/aibox-package-ui/components/field";
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import {
  segmentText,
  type TranscriptionSegmentData,
} from "./transcriptionText";

export function TranscriptionSegmentEditor({
  segment,
  onSave,
  onCancel,
}: {
  segment: TranscriptionSegmentData;
  onSave: (
    expected: TranscriptionSegmentData,
    text: string | null,
    reviewed: boolean,
  ) => Promise<"errorSave" | "errorConflict" | undefined>;
  onCancel: () => void;
}) {
  const { t } = useT("common", { keyPrefix: "_components.Transcription" });
  const id = useId();
  const [original] = useState(segment);
  const [text, setText] = useState(segmentText(segment));
  const [restore, setRestore] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<"errorSave" | "errorConflict">();
  const save = async (reviewed: boolean) => {
    setPending(true);
    setError(undefined);
    try {
      const result = await onSave(original, restore ? null : text, reviewed);
      if (result) setError(result);
    } catch {
      setError("errorSave");
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <FieldGroup>
        <Field data-disabled={pending}>
          <FieldLabel htmlFor={id}>{t("labelSegmentText")}</FieldLabel>
          <Textarea
            id={id}
            autoFocus
            disabled={pending}
            value={text}
            maxLength={100000}
            onChange={(event) => {
              setText(event.target.value);
              setRestore(false);
            }}
            className="min-h-32"
          />
        </Field>
      </FieldGroup>
      <p className="text-muted-foreground text-xs">{t("descriptionUnsaved")}</p>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{t(error)}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={() => void save(false)}>
          {t(pending ? "labelSaving" : "labelSave")}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => void save(true)}
        >
          {t("labelSaveReviewed")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={onCancel}
        >
          {t("labelCancel")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            setText(segmentText({ ...original, segmentOverride: undefined }));
            setRestore(true);
          }}
        >
          {t("labelRestoreOriginal")}
        </Button>
      </div>
    </div>
  );
}
