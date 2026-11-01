import { TranscriberEditorSettingsAppearance } from "./TranscriberEditorSettingsAppearance";
import { TranscriberEditorSettingsDescription } from "./TranscriberEditorSettingsDescription";
import { TranscriberEditorSettingsModel } from "./TranscriberEditorSettingsModel";
import { TranscriberEditorSettingsWorkspace } from "./TranscriberEditorSettingsWorkspace";
import { TranscriberEditorSettingsRetries } from "./TranscriberEditorSettingsRetries";
import { Separator } from "@schornio/aibox-package-ui/components/separator";

export function TranscriberEditorSettings() {
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
    </>
  );
}
