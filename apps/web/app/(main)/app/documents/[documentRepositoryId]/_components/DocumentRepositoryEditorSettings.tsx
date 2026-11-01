import { DocumentRepositoryEditorSettingsAppearance } from "./DocumentRepositoryEditorSettingsAppearance";
import { DocumentRepositoryEditorSettingsDescription } from "./DocumentRepositoryEditorSettingsDescription";
import { DocumentRepositoryEditorSettingsWorkspace } from "./DocumentRepositoryEditorSettingsWorkspace";

export function DocumentRepositoryEditorSettings() {
  return (
    <>
      <DocumentRepositoryEditorSettingsDescription />

      <hr className="my-10" />

      <DocumentRepositoryEditorSettingsAppearance />

      <hr className="my-10" />

      <DocumentRepositoryEditorSettingsWorkspace />
    </>
  );
}
