import type { ConnectionMetadata } from "@schornio/aibox-package-database/connections/_types";
export const connectionFixtures: ConnectionMetadata[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "GitHub",
    kind: "oauth",
    client_id: "example-client",
    market: null,
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Websuche",
    kind: "brave",
    client_id: null,
    market: null,
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    name: "Staan",
    kind: "staan",
    client_id: null,
    market: "de-de",
  },
];
