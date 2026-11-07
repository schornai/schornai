import "./client-setup";
import { beforeEach, expect, it, vi } from "vitest";
import { notFound, redirect } from "next/navigation";
import { isValidElement } from "react";
import NewConnection from "../../apps/web/app/(settings)/settings/connections/new/[kind]/page";
import EditConnection from "../../apps/web/app/(settings)/settings/connections/[connectionId]/page";
import PersonalConnections from "../../apps/web/app/(settings)/me/connections/page";
const state = vi.hoisted(() => ({
  admin: true,
  user: { id: "user" } as { id: string } | null,
  connections: [] as any[],
  list: vi.fn(),
  grants: vi.fn(),
  oauth: vi.fn(),
  privileged: vi.fn(),
}));
vi.mock("../../apps/web/app/_models/getWorkspaceClaims", () => ({
  getWorkspaceClaims: async () => ({ isAdmin: state.admin }),
}));
vi.mock("@/lib/supabase/saveCreateSupabaseServiceRoleClient", () => ({
  saveCreateSupabaseServiceRoleClient: state.privileged,
}));
vi.mock("@/lib/supabase/createSupabaseServiceRoleClient", () => ({
  createSupabaseServiceRoleClient: state.privileged,
}));
vi.mock("@/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
  }),
}));
vi.mock("@schornio/aibox-package-database/connections/listConnections", () => ({
  listConnections: state.list,
}));
vi.mock("@schornio/aibox-package-database/platformMcp/listUserGrants", () => ({
  listUserGrants: state.grants,
}));
vi.mock("@schornio/aibox-package-database/mcp/listMCPOAuthConnections", () => ({
  listMCPOAuthConnections: state.oauth,
}));
vi.mock(
  "../../apps/web/app/(settings)/settings/connections/_components/ConnectionForm",
  () => ({
    ConnectionForm: function ConnectionForm() {
      return null;
    },
  }),
);
vi.mock(
  "../../apps/web/app/(settings)/me/connections/_components/PersonalMCPConnections",
  () => ({
    PersonalMCPConnections: function PersonalMCPConnections() {
      return null;
    },
  }),
);
function elements(node: any): any[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement(node)) return [];
  return [node, ...elements((node.props as any).children)];
}
async function content(page: any) {
  const child = page.props.children;
  return child.type(child.props);
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(notFound).mockImplementation(() => {
    throw new Error("NOT_FOUND");
  });
  vi.mocked(redirect).mockImplementation((path) => {
    throw new Error(`REDIRECT:${path}`);
  });
  state.admin = true;
  state.user = { id: "user" };
  state.connections = [];
  state.list.mockImplementation(async () => state.connections);
  state.privileged.mockReturnValue({ privileged: true });
  state.grants.mockResolvedValue([]);
  state.oauth.mockResolvedValue([]);
});

it.each(["oauth", "brave", "staan"])(
  "creates only a supported %s connection form",
  async (kind) => {
    const result = await content(
      NewConnection({ params: Promise.resolve({ kind }) }),
    );
    expect(
      elements(result).find((node) => node.type.name === "ConnectionForm")
        .props,
    ).toEqual({ kind });
    expect(state.privileged).not.toHaveBeenCalled();
  },
);
it.each(["unknown", "", "OAuth"])(
  "rejects unsupported connection kind %j",
  async (kind) => {
    await expect(
      content(NewConnection({ params: Promise.resolve({ kind }) })),
    ).rejects.toThrow("NOT_FOUND");
  },
);
it.each(["create", "edit"])(
  "denies non-admin %s pages before using a privileged client",
  async (mode) => {
    state.admin = false;
    const page =
      mode === "create"
        ? NewConnection({ params: Promise.resolve({ kind: "oauth" }) })
        : EditConnection({
            params: Promise.resolve({ connectionId: "connection" }),
          });
    await expect(content(page)).rejects.toThrow("NOT_FOUND");
    expect(state.list).not.toHaveBeenCalled();
    expect(state.privileged).not.toHaveBeenCalled();
  },
);
it.each(["oauth", "brave", "staan"])(
  "selects the requested %s connection for editing",
  async (kind) => {
    const connection = { id: "selected", kind, name: "Chosen" };
    state.connections = [
      { id: "other", kind: "brave", name: "Other" },
      connection,
    ];
    const result = await content(
      EditConnection({ params: Promise.resolve({ connectionId: "selected" }) }),
    );
    expect(
      elements(result).find((node) => node.type.name === "ConnectionForm")
        .props,
    ).toEqual({ kind, connection });
    expect(state.list).toHaveBeenCalledExactlyOnceWith({
      supabase: { privileged: true },
    });
  },
);
it.each([
  { connections: [] },
  { connections: [{ id: "selected", kind: "unsupported" }] },
])(
  "rejects missing or unsupported saved connections",
  async ({ connections }) => {
    state.connections = connections;
    await expect(
      content(
        EditConnection({
          params: Promise.resolve({ connectionId: "selected" }),
        }),
      ),
    ).rejects.toThrow("NOT_FOUND");
  },
);
it("redirects signed-out users before loading any personal grants", async () => {
  state.user = null;
  await expect(content(PersonalConnections())).rejects.toThrow(
    "REDIRECT:/signin",
  );
  expect(state.privileged).not.toHaveBeenCalled();
  expect(state.oauth).not.toHaveBeenCalled();
  expect(state.grants).not.toHaveBeenCalled();
});
it("loads both connection families for the authenticated user only", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-07T12:00:00Z"));
  const grants = [{ id: "grant", clientName: "Desktop" }];
  state.grants.mockResolvedValue(grants);
  state.oauth.mockResolvedValue([
    { server_url: "https://mcp.test", access_token: "private" },
  ]);
  const result = await content(PersonalConnections());
  for (const list of [state.oauth, state.grants])
    expect(list).toHaveBeenCalledExactlyOnceWith("user", {
      supabase: { privileged: true },
    });
  expect(
    elements(result).find((node) => node.type.name === "PersonalMCPConnections")
      .props,
  ).toEqual({
    grants,
    serverUrls: ["https://mcp.test"],
    now: "2026-11-07T12:00:00.000Z",
  });
});
