import { DocumentRepositoryEditorFeaturesIndex } from "./DocumentRepositoryEditorFeaturesIndex";
import { DocumentRepositoryEditorFeaturesTranscriber } from "./DocumentRepositoryEditorFeaturesTranscriber";

export function DocumentRepositoryEditorFeatures() {
  return (
    <>
      <DocumentRepositoryEditorFeaturesIndex />

      <hr className="my-10" />

      <DocumentRepositoryEditorFeaturesTranscriber />
    </>
  );
}
