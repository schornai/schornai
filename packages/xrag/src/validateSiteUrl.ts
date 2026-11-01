export function validateSiteUrl(value: string) {
  if (/[\s$'"`\\]/.test(value)) throw new Error("Invalid site URL");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid site URL");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error(
      "Site URL must be an HTTPS origin without credentials, path, query or fragment",
    );
  }
  return url.origin;
}
