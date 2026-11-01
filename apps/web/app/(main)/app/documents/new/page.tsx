import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import { DocumentRepositoryEditor } from "../[documentRepositoryId]/_components/DocumentRepositoryEditor";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { defaultColors } from "@/lib/defaultColors";
import { defaultDocumentRepositoryIcons } from "@/lib/defaultDocumentRepositoryIcons";
import { getAIModels } from "../../../../_models/getAIModels";
import { getSystemConfigTheme } from "../../../../_models/systemConfigTheme";
import { getTranscribers } from "@schornio/aibox-package-database/transcriber/getTranscribers";
import { getWorkspaceClaims } from "../../../../_models/getWorkspaceClaims";
import { pickRandom } from "@schornio/aibox-package-utils/pickRandom";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const [models, transcribers, theme, { claims: workspaces }] =
    await Promise.all([
      getAIModels(),
      getTranscribers({ supabase }),
      getSystemConfigTheme(),
      getWorkspaceClaims(),
    ]);

  const defaultDocumentRepository: Partial<DocumentRepository> = {
    color: pickRandom(
      (theme.colors ?? defaultColors).map(({ color }) => color),
      {
        oklchHue: 0,
        type: "color-oklch-hue",
      },
    ),
    description: "",
    icon: {
      iconName: pickRandom(defaultDocumentRepositoryIcons, "x"),
      type: "icon-lucide",
    },
    id: crypto.randomUUID(),
    identifier: crypto.randomUUID(),
    index: {
      keyword: { active: true },
    },
    name: "",
  };

  return (
    <DocumentRepositoryEditor
      documentRepository={defaultDocumentRepository}
      mode="create"
      relations={{ models, theme, transcribers, workspaces }}
    />
  );
}
