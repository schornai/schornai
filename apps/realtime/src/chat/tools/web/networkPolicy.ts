import { lookup } from "node:dns/promises";
import type { LookupFunction } from "node:net";
import { BlockList, isIP } from "node:net";

const nonPublicV4 = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  nonPublicV4.addSubnet(network, prefix);
const publicV6 = new BlockList();
publicV6.addSubnet("2000::", 3, "ipv6");
const nonPublicV6 = new BlockList();
nonPublicV6.addSubnet("2001::", 23, "ipv6");
nonPublicV6.addSubnet("2001:db8::", 32, "ipv6");
nonPublicV6.addSubnet("2002::", 16, "ipv6");
nonPublicV6.addSubnet("3fff::", 20, "ipv6");

function isPublicAddress(address: string) {
  const family = isIP(address);
  return family === 4
    ? !nonPublicV4.check(address, "ipv4")
    : family === 6 &&
        publicV6.check(address, "ipv6") &&
        !nonPublicV6.check(address, "ipv6");
}

/** Resolve once and pin the checked addresses into the actual TCP connection. */
export async function resolveWebTarget(
  hostname: string,
  signal: AbortSignal,
  allowPrivateNetwork: boolean,
): Promise<LookupFunction> {
  const host = hostname.replace(/^\[|\]$/g, "");
  const family = isIP(host);
  let onAbort: (() => void) | undefined;
  const addresses = family
    ? [{ address: host, family }]
    : await Promise.race([
        lookup(host, { all: true, verbatim: true }),
        new Promise<never>((_resolve, reject) => {
          onAbort = () => reject(signal.reason);
          signal.addEventListener("abort", onAbort, { once: true });
          if (signal.aborted) onAbort();
        }),
      ]).finally(() => {
        if (onAbort) signal.removeEventListener("abort", onAbort);
      });
  signal.throwIfAborted();
  if (
    !addresses.length ||
    (!allowPrivateNetwork &&
      addresses.some(({ address }) => !isPublicAddress(address)))
  ) {
    throw new Error(
      "Private network access requires an exact host in the web fetch whitelist.",
    );
  }
  const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
    if (options.all) callback(null, addresses);
    else callback(null, addresses[0]!.address, addresses[0]!.family);
  };
  return pinnedLookup;
}
