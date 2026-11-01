async function tikaConvertFileToMarkdown(file: Blob, apacheTikaUrl: string) {
  const result = await fetch(`${apacheTikaUrl}/tika/md`, {
    body: file,
    headers: {
      "Content-Type": file.type,
    },
    method: "PUT",
  });

  if (!result.ok) {
    throw new Error("Failed to fetch from Tika");
  }

  return await result.text();
}

export async function fileToMarkdown(
  file: Blob | File,
  config?: {
    environmentKeys?: {
      apacheTikaUrl?: string;
    };
  },
) {
  const apacheTikaUrlEnvKey =
    config?.environmentKeys?.apacheTikaUrl ?? "DOCUMENT_EXTRACTOR_URL";
  const apacheTikaUrl =
    process.env[apacheTikaUrlEnvKey] ||
    (config?.environmentKeys?.apacheTikaUrl
      ? undefined
      : process.env.APACHE_TIKA_URL);
  if (!apacheTikaUrl || apacheTikaUrl.length === 0) {
    throw new Error(`Environment variable "${apacheTikaUrlEnvKey}" not set.`);
  }

  if (file.type === "application/octet-stream") {
    const ext = "name" in file ? file.name.split(".").pop() : undefined;
    if (ext === "ts") {
      return await file.text();
    }
  }

  const markdown = await tikaConvertFileToMarkdown(file, apacheTikaUrl);

  if (!/[\p{L}\p{N}]/u.test(markdown)) {
    return undefined;
  }

  return markdown;
}
