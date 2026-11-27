import { DocumentRepositoryEditor } from "../_components/DocumentRepositoryEditor";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getAIModels } from "../../../../../_models/getAIModels";
import { getDocumentRepositoryById } from "@schornio/aibox-package-database/documentRepositories/getDocumentRepositoryById";
import { getSystemConfigTheme } from "../../../../../_models/systemConfigTheme";
import { getTranscribers } from "@schornio/aibox-package-database/transcriber/getTranscribers";
import { getWorkspaceClaims } from "../../../../../_models/getWorkspaceClaims";
import { notFound } from "next/navigation";
import { tryAsync } from "@schornio/aibox-package-utils/tryAsync";

export default async function Page(
  props: PageProps<"/app/documents/[documentRepositoryId]/edit">,
) {
  const [{ documentRepositoryId }, supabase] = await Promise.all([
    props.params,
    createSupabaseServerClient(),
  ]);

  const [
    { data: documentRepository },
    models,
    transcribers,
    theme,
    { claims: workspaces },
  ] = await Promise.all([
    tryAsync(() =>
      getDocumentRepositoryById(documentRepositoryId, { supabase }),
    ),
    getAIModels(),
    getTranscribers({ supabase }),
    getSystemConfigTheme(),
    getWorkspaceClaims(),
  ]);

  if (!documentRepository) {
    notFound();
  }

  return (
    <DocumentRepositoryEditor
      documentRepository={documentRepository}
      mode="update"
      relations={{ models, theme, transcribers, workspaces }}
    />
  );
}
