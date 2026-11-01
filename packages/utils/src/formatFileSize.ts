export function formatFileSize(size: number) {
  if (size < 1_000) {
    return `${size} Byte`;
  }

  if (size < 1_000_000) {
    return `${Math.ceil(size / 1_000)} kB`;
  }

  if (size < 1_000_000_000) {
    return `${Math.ceil(size / 1_000_000)} MB`;
  }

  return `${Math.ceil(size / 1_000_000_000)} GB`;
}
