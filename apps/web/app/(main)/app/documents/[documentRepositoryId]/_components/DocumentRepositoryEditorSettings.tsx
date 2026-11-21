"use client";
import { XRAGIdentitySettings } from "../../../../../_components/xrag/XRAGIdentitySettings";
import { useDocumentRepositoryEditor } from "./DocumentRepositoryEditor";
import { DocumentRepositoryEditorSettingsAppearance } from "./DocumentRepositoryEditorSettingsAppearance";
import { DocumentRepositoryEditorSettingsDescription } from "./DocumentRepositoryEditorSettingsDescription";
import { DocumentRepositoryEditorSettingsWorkspace } from "./DocumentRepositoryEditorSettingsWorkspace";

export function DocumentRepositoryEditorSettings({
  mode = "update",
}: {
  mode?: "create" | "update";
}) {
  const { defaultDocumentRepository } = useDocumentRepositoryEditor();
  return (
    <>
      <DocumentRepositoryEditorSettingsDescription />

      <hr className="my-10" />

      <DocumentRepositoryEditorSettingsAppearance />

      <hr className="my-10" />

      <DocumentRepositoryEditorSettingsWorkspace />

      {mode === "update" && defaultDocumentRepository?.id && (
        <>
          <hr className="my-10" />
          <XRAGIdentitySettings
            kind="documentRepository"
            id={defaultDocumentRepository.id}
          />
        </>
      )}
    </>
  );
}
