import { getEnvSafe } from "@schornio/aibox-package-utils/getEnvSafe";

export async function readFileContent(file: Blob, abortSignal?: AbortSignal) {
  const documentExtractorUrl =
    process.env.DOCUMENT_EXTRACTOR_URL ||
    process.env.APACHE_TIKA_URL ||
    getEnvSafe("DOCUMENT_EXTRACTOR_URL");
  const tikaResponse = await fetch(`${documentExtractorUrl}/tika/md`, {
    body: file,
    headers: {
      "Content-Type": file.type,
    },
    method: "PUT",
    signal: abortSignal,
  });

  if (!tikaResponse.ok) {
    return undefined;
  }

  const markdown = await tikaResponse.text();

  if (!/[\p{L}\p{N}]/u.test(markdown)) {
    return undefined;
  }

  return markdown;
}
