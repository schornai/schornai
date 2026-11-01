import { pingBox } from "./pingBox";
import { raceAll } from "./raceAll";

export async function* findBoxes(ip: string) {
  const ipParts = ip.split(".").map((ipPart) => Number.parseInt(ipPart));
  ipParts.pop(); // Last part gets replaced with range from 1 to 254
  const ipPartsString = ipParts.join(".");
  // index + 1 because .0 is not a valid host
  // length: 253 because 0 and 255 ar not valid hosts
  const possibleIps = Array.from({ length: 253 }).map(
    (_, index) => `${ipPartsString}.${index + 1}`,
  );

  const pingBoxResults = possibleIps.map((ip) => pingBox(ip));

  for await (const result of raceAll(pingBoxResults)) {
    yield result;
  }
}
