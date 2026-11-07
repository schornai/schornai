import type { UserMcpGrant } from "@schornio/aibox-package-database/platformMcp/listUserGrants";
export const now = "2026-11-07T12:00:00Z";
export const grants: UserMcpGrant[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Mein KI-Assistent",
    level: "editor",
    resource: "https://schorn.example/mcp",
    createdAt: "2026-11-01T09:30:00Z",
    expiresAt: "2026-12-01T09:30:00Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Projektassistent",
    level: "workspace",
    resource: "https://schorn.example/mcp",
    createdAt: "2026-10-01T09:30:00Z",
    expiresAt: "2026-10-31T09:30:00Z",
  },
];
