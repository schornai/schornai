/** Canonicalize characters before interpreting path separators or dot segments. */
export function normalizePathCharacters(path: string) {
  return path
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("ß", "ss")
    .replaceAll("–", "-")
    .replace(/[\\?%*:|"<>]/g, "");
}

export function resolvePath(path?: string, config?: { s3Compatible: boolean }) {
  const input = path ?? "";
  const canonical =
    (config?.s3Compatible ?? true) ? normalizePathCharacters(input) : input;
  const stack: string[] = [];
  for (const segment of canonical.split("/")) {
    switch (segment) {
      case "..":
        stack.pop();
        break;
      case "":
      case ".":
        break;
      default:
        stack.push(segment);
    }
  }
  return stack.join("/");
}
