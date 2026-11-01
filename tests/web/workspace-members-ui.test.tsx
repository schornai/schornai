// @vitest-environment jsdom
import "./client-setup";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WorkspaceEditPermissionListProvider } from "../../apps/web/app/(settings)/settings/workspace/[workspaceId]/_components/WorkspaceEditPermissionListProvider";
import { WorkspaceEditPermissionListTable } from "../../apps/web/app/(settings)/settings/workspace/[workspaceId]/_components/WorkspaceEditPermissionListTable";
vi.mock(
  "../../apps/web/app/(settings)/settings/_actions/updatePermission",
  () => ({ updatePermission: vi.fn() }),
);
vi.mock("@/lib/groupSortView/action", () => ({ savePreferences: vi.fn() }));
afterEach(cleanup);
it("links accounts from the global admin membership table", () => {
  render(
    <WorkspaceEditPermissionListProvider
      id="members"
      userPreferences={{}}
      users={[
        {
          id: "member",
          name: "Member",
          email: "member@example.test",
          signInMethod: "email",
          workspaceRole: "user",
        },
      ]}
    >
      <WorkspaceEditPermissionListTable workspaceId="own" />
    </WorkspaceEditPermissionListProvider>,
  );
  expect(
    screen.getByRole("link", { name: "Member" }).getAttribute("href"),
  ).toBe("/settings/user/member");
});
