import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";

import {
  storageDownloadResponse,
  storageFileResponse,
} from "@/lib/storageDownloadResponse";
import { downloadThemeLogo } from "@schornio/aibox-package-database/storage/downloadThemeLogo";

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

  const { data, error } = await supabase.storage
    .from(storage)
    .createSignedUrl(path.join("/"), 60);

  if (error || !data) {
    return new Response(undefined, { status: 404 });
  }

  return storageDownloadResponse(request, data.signedUrl);
}
