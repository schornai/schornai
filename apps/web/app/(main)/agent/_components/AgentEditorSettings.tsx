import { AgentEditorSettingsAdditionalFunctions } from "./AgentEditorSettingsAdditionalFunctions";
import { AgentEditorSettingsAppearance } from "./AgentEditorSettingsAppearance";
import { AgentEditorSettingsDescription } from "./AgentEditorSettingsDescription";
import { AgentEditorSettingsModel } from "./AgentEditorSettingsModel";
import { AgentEditorSettingsWorkspace } from "./AgentEditorSettingsWorkspace";

export function AgentEditorSettings() {
  return (
    <>
      <AgentEditorSettingsDescription />

      <hr className="my-10" />

      <AgentEditorSettingsAdditionalFunctions />

      <hr className="my-10" />

      <AgentEditorSettingsAppearance />

      <hr className="my-10" />

      <AgentEditorSettingsModel />

      <hr className="my-10" />

      <AgentEditorSettingsWorkspace />
    </>
  );
}
