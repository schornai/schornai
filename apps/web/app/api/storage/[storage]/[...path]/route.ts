import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";

import {
  storageDownloadResponse,
  storageFileResponse,
} from "@/lib/storageDownloadResponse";
import { downloadThemeLogo } from "@schornio/aibox-package-database/storage/downloadThemeLogo";
import { getFileTextBackup } from "@schornio/aibox-package-database/storage/getFileTextBackup";

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/storage/[storage]/[...path]">,
) {
  const [{ path, storage }, supabase] = await Promise.all([
    params,
    createSupabaseServerClient(),
  ]);

  // Logo policies allow downloads before sign-in, but not URL signing.
  // The bucket caps these blobs at 5 MB.
  if (storage === "theme_logos") {
    const { data, error } = await downloadThemeLogo(path.join("/"), {
      supabase,
      signal: request.signal,
    });
    if (error || !data) return new Response(null, { status: 404 });
    return storageFileResponse(new Response(data));
  }

  if (["database_files", "realtime_files"].includes(storage)) {
    try {
      const backup = await getFileTextBackup(path.join("/"), {
        storage: supabase.storage.from(storage),
        signal: request.signal,
      });
      if (backup)
        return backup.blob
          ? storageFileResponse(new Response(backup.blob))
          : new Response(null, { status: 404 });
    } catch {
      return new Response(null, { status: 503 });
    }
  }
  const { data, error } = await supabase.storage
    .from(storage)
    .createSignedUrl(path.join("/"), 60);

  if (error || !data) {
    return new Response(undefined, { status: 404 });
  }

  return storageDownloadResponse(request, data.signedUrl);
}
