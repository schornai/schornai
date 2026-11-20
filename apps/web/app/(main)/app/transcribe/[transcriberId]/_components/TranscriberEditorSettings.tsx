"use client";
import { XRAGIdentitySettings } from "../../../../../_components/xrag/XRAGIdentitySettings";
import { useTranscriberEditor } from "./TranscriberEditor";
import { TranscriberEditorSettingsAppearance } from "./TranscriberEditorSettingsAppearance";
import { TranscriberEditorSettingsDescription } from "./TranscriberEditorSettingsDescription";
import { TranscriberEditorSettingsModel } from "./TranscriberEditorSettingsModel";
import { TranscriberEditorSettingsWorkspace } from "./TranscriberEditorSettingsWorkspace";
import { TranscriberEditorSettingsRetries } from "./TranscriberEditorSettingsRetries";
import { Separator } from "@schornio/aibox-package-ui/components/separator";

export function TranscriberEditorSettings({
  mode = "update",
}: {
  mode?: "create" | "update";
}) {
  const { defaultTranscriber } = useTranscriberEditor();
  return (
    <>
      <TranscriberEditorSettingsDescription />

      <hr className="my-10" />

      <TranscriberEditorSettingsAppearance />

      <hr className="my-10" />

      <TranscriberEditorSettingsModel />

      <Separator className="my-10" />

      <TranscriberEditorSettingsRetries />

      <hr className="my-10" />

      <TranscriberEditorSettingsWorkspace />

      {mode === "update" && defaultTranscriber?.id && (
        <>
          <hr className="my-10" />
          <XRAGIdentitySettings kind="transcriber" id={defaultTranscriber.id} />
        </>
      )}
    </>
  );
}
