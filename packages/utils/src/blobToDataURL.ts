export async function blobToDataURL(blob: Blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");
  const mimeType = blob.type ?? "application/octet-stream";
  return `data:${mimeType};base64,${base64}`;
}
