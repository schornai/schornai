import { notFound } from "next/navigation";
import { hasPermission } from "@/lib/hasPermission";
import { TranscriberEditor } from "../[transcriberId]/_components/TranscriberEditor";
import type { Transcriber_new } from "@schornio/aibox-package-database/transcriber/_types";
import { defaultColors } from "@/lib/defaultColors";
import { defaultTranscriberIcons } from "@/lib/defaultTranscriberIcons";
import { getAIModels } from "../../../../_models/getAIModels";
import { getSystemConfigTheme } from "../../../../_models/systemConfigTheme";
import { getWorkspaceClaims } from "../../../../_models/getWorkspaceClaims";
import { pickRandom } from "@schornio/aibox-package-utils/pickRandom";

export default async function Page() {
  const [models, theme, { claims: workspaces }] = await Promise.all([
    getAIModels(),
    getSystemConfigTheme(),
    getWorkspaceClaims(),
  ]);

  if (
    !workspaces.some((workspace) =>
      hasPermission({ claim: workspace.claim, permission: "workspace-admin" }),
    )
  )
    notFound();

  const transcriberModels = models.filter(
    (model) => model.type === "mlx_whisper_v1",
  );

  const defaultTranscriptor: Partial<Transcriber_new> = {
    color: pickRandom(
      (theme.colors ?? defaultColors).map(({ color }) => color),
      {
        oklchHue: 0,
        type: "color-oklch-hue",
      },
    ),
    description: "",
    icon: {
      iconName: pickRandom(defaultTranscriberIcons, "x"),
      type: "icon-lucide",
    },
    id: crypto.randomUUID(),
    identifier: crypto.randomUUID(),
    modelIdentifier:
      transcriberModels.length === 1
        ? transcriberModels[0]?.identifier
        : undefined,
    name: "",
    prompt: "",
    version: "transcriber-v2",
  };

  return (
    <TranscriberEditor
      mode="create"
      relations={{ models, theme, workspaces }}
      transcriber={defaultTranscriptor}
    />
  );
}
