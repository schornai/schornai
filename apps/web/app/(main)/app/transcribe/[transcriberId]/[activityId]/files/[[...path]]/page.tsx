import { ensureActivity } from "@/lib/ensureActivity";
import { getCurrentUser } from "@schornio/aibox-package-database/user/getCurrentUser";
import { File } from "../_components/File";
import { Folder } from "../_components/Folder";
import { StorageSession } from "@schornio/aibox-package-database/storage/_utils/StorageSession";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { inspect } from "@schornio/aibox-package-database/storage/inspect";
import { notFound } from "next/navigation";

export default async function Page(
  params: PageProps<"/app/transcribe/[transcriberId]/[activityId]/files/[[...path]]">,
) {
  const [{ activityId, path: pathSegments, transcriberId }, supabase] =
    await Promise.all([params.params, createSupabaseServerClient()]);

  const user = await getCurrentUser({ supabaseAuth: supabase.auth });
  await ensureActivity(
    user.id,
    { activityId, transcriberId, type: "activity-transcription" },
    { publishActivity: false },
  );

  const path =
    pathSegments?.map((segment) => decodeURIComponent(segment)).join("/") ??
    "/";

  const storageObject = await inspect(
    path,
    new StorageSession({
      storage: { activityId, transcriberId, type: "activity-transcription" },
      supabaseStorage: supabase.storage,
    }),
  );

  if (!storageObject) {
    notFound();
  }

  return (
    <>
      {storageObject?.file ? (
        <File
          activityId={activityId}
          transcriberId={transcriberId}
          file={storageObject}
        />
      ) : undefined}
      {storageObject?.folder ? (
        <Folder
          activityId={activityId}
          transcriberId={transcriberId}
          path={path}
        />
      ) : undefined}
    </>
  );
}
