import type { Agent } from "./_types.ts";

export type WebAccessConfig = NonNullable<
  Agent["roles"][number]["toolWebAccess"]
>;

export const defaultWebAccess: WebAccessConfig = {
  active: true,
  webFetch: "off",
  webFetchAccess: "allow-all",
  webFetchAllowList: [],
  webSearch: "off",
  webSearchProvider: "staan",
};

// Exact hostnames and explicit wildcard subdomains only; never URL prefixes.
export function normalizeWebDomain(value: string): string | undefined {
  const wildcard = value.trim().startsWith("*.");
  const host = value.trim().replace(/^\*\./, "");
  if (!host || /[\s/:?#@\\%]/.test(host)) return undefined;
  try {
    const normalized = new URL(`https://${host}`).hostname.replace(/\.$/, "");
    if (
      !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(
        normalized,
      )
    )
      return undefined;
    return `${wildcard ? "*." : ""}${normalized}`;
  } catch {
    return undefined;
  }
}

export function isWebUrlAllowed(url: URL, config: WebAccessConfig): boolean {
  if (!config.active || !["on", "ask"].includes(config.webFetch ?? "off"))
    return false;
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    return false;
  if (config.webFetchAccess === "allow-all") return true;
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  return config.webFetchAllowList.some((entry) => {
    const domain = normalizeWebDomain(entry);
    return domain?.startsWith("*.")
      ? hostname.endsWith(domain.slice(1)) && hostname !== domain.slice(2)
      : domain === hostname;
  });
}
