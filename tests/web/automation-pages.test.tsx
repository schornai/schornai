import "./client-setup";
vi.mock("../../apps/web/app/(main)/_actions/updateFavorite", () => ({
  updateFavorite: vi.fn(),
}));
vi.mock("../../apps/web/app/_models/currentUserConfigFavorites", () => ({
  getCurrentUserConfigFavorites: async () => ({
    version: "favorites-v2",
    showInSidebar: true,
    favorites: [],
  }),
}));
vi.mock("../../apps/web/app/_models/systemConfigTheme", () => ({
  getSystemConfigTheme: async () => ({ version: "theme-v2" }),
}));
import { beforeEach, expect, it, vi } from "vitest";
import { redirect, notFound } from "next/navigation";
import {
  savedAutomation,
  agents,
  repositories,
} from "../../apps/web/stories/(main)/app/automation/fixtures";
const io = vi.hoisted(() => ({
  list: vi.fn(),
  agents: vi.fn(),
  history: vi.fn(),
  context: vi.fn(),
}));
vi.mock("../../apps/web/app/_models/getAutomationContext", () => ({
  getAutomationContext: io.context,
}));
vi.mock("@schornio/aibox-package-database/automation/getAutomations", () => ({
  getAutomations: io.list,
}));
vi.mock(
  "@schornio/aibox-package-database/automation/getAutomationRuns",
  () => ({ getAutomationRuns: io.history }),
);
vi.mock("@schornio/aibox-package-database/agent/getAgents", () => ({
  getAgents: io.agents,
}));
vi.mock("../../apps/web/app/_models/getDocumentRepositories", () => ({
  getDocumentRepositories: async () => repositories,
}));
vi.mock("../../apps/web/app/_models/getAIModels", () => ({
  getAIModels: async () => [],
}));
vi.mock("../../apps/web/app/_models/getWorkspaceClaims", () => ({
  getWorkspaceClaims: async () => ({ claims: [] }),
}));
vi.mock("@/lib/groupSortView/model", () => ({
  getGroupSortViewPreferences: async () => ({ view: "cards" }),
}));
import { getAutomationPageData } from "../../apps/web/app/(main)/app/automation/_models/getAutomationPageData";
import ListPage from "../../apps/web/app/(main)/app/automation/page";
import NewPage from "../../apps/web/app/(main)/app/automation/new/page";
import EditPage from "../../apps/web/app/(main)/app/automation/[automationId]/edit/page";
import InfoPage from "../../apps/web/app/(main)/app/automation/[automationId]/info/page";
import RunsPage from "../../apps/web/app/(main)/app/automation/[automationId]/runs/page";
import DetailPage from "../../apps/web/app/(main)/app/automation/[automationId]/page";
beforeEach(() => {
  io.context.mockResolvedValue({
    userId: "owner",
    claims: [{ organization_id: "demo", role: "editor" }],
    supabase: {},
    supabaseServiceRole: {},
  });
  io.list.mockResolvedValue([savedAutomation]);
  io.agents.mockResolvedValue([
    ...agents,
    { ...agents[0], id: "other", workspaceId: "foreign" },
  ]);
  io.history.mockResolvedValue([]);
  vi.mocked(redirect).mockImplementation((path) => {
    throw new Error(`REDIRECT ${path}`);
  });
  vi.mocked(notFound).mockImplementation(() => {
    throw new Error("NOT_FOUND");
  });
});
it("loads only owned automations and only selectable editor agents on detail pages", async () => {
  const result = await getAutomationPageData(savedAutomation.id);
  expect(result.automation).toEqual(savedAutomation);
  expect(result.agents).toEqual(agents);
  await expect(getAutomationPageData("foreign-id")).rejects.toThrow(
    "NOT_FOUND",
  );
  io.context.mockRejectedValueOnce(new Error("NOT_AUTHORIZED"));
  await expect(getAutomationPageData()).rejects.toThrow("NOT_AUTHORIZED");
});
it("serves list, new, edit and info routes using the same authorized data", async () => {
  const params = Promise.resolve({ automationId: savedAutomation.id });
  expect(await ListPage({ searchParams: Promise.resolve({}) })).toBeTruthy();
  expect((await NewPage()).props.initial).toBeUndefined();
  expect((await EditPage({ params })).props.initial).toEqual(savedAutomation);
  expect(await InfoPage({ params })).toBeTruthy();
  expect(await RunsPage({ params })).toBeTruthy();
  expect(io.history).toHaveBeenCalledWith(
    savedAutomation.id,
    expect.objectContaining({ userId: "owner" }),
  );
  io.history.mockResolvedValue([
    {
      id: "queued",
      state: "queued",
      activity_id: "chat",
      created_at: "2030-01-01",
    },
    { id: "failed", state: "failed", created_at: "2030-01-01" },
  ]);
  expect(await RunsPage({ params })).toBeTruthy();
});
it("preserves existing bookmarked links and routes resource roots to info", async () => {
  await expect(
    ListPage({ searchParams: Promise.resolve({ edit: "new" }) }),
  ).rejects.toThrow("REDIRECT /app/automation/new");
  await expect(
    ListPage({ searchParams: Promise.resolve({ edit: savedAutomation.id }) }),
  ).rejects.toThrow(`REDIRECT /app/automation/${savedAutomation.id}/edit`);
  await expect(
    ListPage({ searchParams: Promise.resolve({ runs: savedAutomation.id }) }),
  ).rejects.toThrow(`REDIRECT /app/automation/${savedAutomation.id}/runs`);
  await expect(
    DetailPage({
      params: Promise.resolve({ automationId: savedAutomation.id }),
    }),
  ).rejects.toThrow(`REDIRECT /app/automation/${savedAutomation.id}/info`);
});
