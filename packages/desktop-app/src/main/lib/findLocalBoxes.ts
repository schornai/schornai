import { findBoxes } from "./findBoxes";
import { getOwnIPv4 } from "./getOwnIPv4";
import { merge } from "./merge";

export async function* findLocalBoxes() {
  const ips = getOwnIPv4();
  for await (const element of merge(ips.map((ip) => findBoxes(ip)))) {
    if (element.data) {
      yield element.data;
    }
  }
}
