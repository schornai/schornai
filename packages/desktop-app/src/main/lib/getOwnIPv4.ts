import { networkInterfaces as getNetworkInterfaces } from 'node:os';

export function getOwnIPv4() {
  const networkInterfaces = getNetworkInterfaces();
  const ipv4Addresses: string[] = [];

  for (const networkInterface of Object.values(networkInterfaces)) {
    if (!networkInterface) {
      continue;
    }

    for (const address of networkInterface) {
      if (address.family === 'IPv4' && !address.internal) {
        ipv4Addresses.push(address.address);
      }
    }
  }
  return ipv4Addresses;
}
