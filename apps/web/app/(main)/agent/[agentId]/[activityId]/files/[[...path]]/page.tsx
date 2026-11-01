import { ensureActivity } from "@/lib/ensureActivity";
import { getCurrentUser } from "@schornio/aibox-package-database/user/getCurrentUser";
import { File } from "../_components/File";
import { Folder } from "../_components/Folder";
import { StorageSession } from "@schornio/aibox-package-database/storage/_utils/StorageSession";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { inspect } from "@schornio/aibox-package-database/storage/inspect";
import { notFound } from "next/navigation";

export default async function Page(
  params: PageProps<"/agent/[agentId]/[activityId]/files/[[...path]]">,
) {
  const [{ agentId, activityId, path: pathSegments }, supabase] =
    await Promise.all([params.params, createSupabaseServerClient()]);

  const user = await getCurrentUser({ supabaseAuth: supabase.auth });
  await ensureActivity(
    user.id,
    { activityId, agentId, type: "activity" },
    { publishActivity: false },
  );

  const path =
    pathSegments?.map((segment) => decodeURIComponent(segment)).join("/") ??
    "/";

  const storageObject = await inspect(
    path,
    new StorageSession({
      storage: { activityId, agentId, type: "activity" },
      supabaseStorage: supabase.storage,
    }),
  );

  if (!storageObject) {
    notFound();
  }

  return (
    <>
      {storageObject.file ? (
        <File activityId={activityId} agentId={agentId} file={storageObject} />
      ) : undefined}

      {storageObject.folder ? (
        <Folder activityId={activityId} agentId={agentId} path={path} />
      ) : undefined}
    </>
  );
}
