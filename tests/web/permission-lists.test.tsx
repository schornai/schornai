// @vitest-environment jsdom
import "./client-setup";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { client } from "./client-setup";
import {
  UserEditPermissionListProvider,
  useUserEditPermissionList,
} from "../../apps/web/app/(settings)/settings/user/[userId]/_components/UserEditPermissionListProvider";
import {
  WorkspaceEditPermissionListProvider,
  useWorkspaceEditPermissionList,
} from "../../apps/web/app/(settings)/settings/workspace/[workspaceId]/_components/WorkspaceEditPermissionListProvider";
import { UserEditPermissionList } from "../../apps/web/app/(settings)/settings/user/[userId]/_components/UserEditPermissionList";
import { WorkspaceEditPermissionList } from "../../apps/web/app/(settings)/settings/workspace/[workspaceId]/_components/WorkspaceEditPermissionList";
import { UserEditPermissionListTablePermissionCell } from "../../apps/web/app/(settings)/settings/user/[userId]/_components/UserEditPermissionListTablePermissionCell";
import { WorkspaceEditPermissionListTablePermissionCell } from "../../apps/web/app/(settings)/settings/workspace/[workspaceId]/_components/WorkspaceEditPermissionListTablePermissionCell";
vi.mock("@/lib/groupSortView/action", () => ({ savePreferences: vi.fn() }));
vi.mock(
  "../../apps/web/app/(settings)/settings/_actions/updatePermission",
  () => ({ updatePermission: vi.fn() }),
);
afterEach(cleanup);
beforeEach(() => {
  client.params = new URLSearchParams();
  client.execute.mockClear();
  client.push.mockClear();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
const roles = ["workspace-admin", "editor", "user", undefined];
const cases = [
  [
    "user",
    UserEditPermissionListProvider,
    useUserEditPermissionList,
    UserEditPermissionList,
    "workspaces",
    "userRole",
  ],
  [
    "workspace",
    WorkspaceEditPermissionListProvider,
    useWorkspaceEditPermissionList,
    WorkspaceEditPermissionList,
    "users",
    "workspaceRole",
  ],
] as const;
for (const [kind, Provider, useList, List, prop, roleProp] of cases) {
  const data: any[] = roles.map((role, index) => ({
    id: `${index}`,
    name: ["Alpha", "Beta", "Gamma", "Delta"][index],
    description: "Description",
    email: `person${index}@example.test`,
    [roleProp]: role,
  }));
  const wrapper =
    (group: string, sort = "name:asc") =>
    ({ children }: any) => (
      <Provider
        {...({
          [prop]: data,
          id: "permission",
          userPreferences: { group, sort },
        } as any)}
      >
        {children}
      </Provider>
    );
  describe(`${kind} permissions`, () => {
    it.each(["permission", "first-letter", "no-group"])(
      "renders grouped %s and filters entries",
      async (group) => {
        const Wrap = wrapper(group);
        render(
          <Wrap>
            <List userId="user" workspaceId="workspace" />
          </Wrap>,
        );
        expect(screen.getByRole("link", { name: "Alpha" })).toBeTruthy();
        fireEvent.change(screen.getByPlaceholderText("placeholderSearch"), {
          target: { value: "Gamma" },
        });
        await waitFor(() =>
          expect(screen.queryByRole("link", { name: "Alpha" })).toBeNull(),
        );
        expect(screen.getByRole("link", { name: "Gamma" })).toBeTruthy();
      },
    );
    it("retains nullable roles, respects name/email sorting and rejects absent providers", () => {
      const { result } = renderHook(useList, {
        wrapper: wrapper(
          "first-letter",
          kind === "workspace" ? "email:desc" : "name:desc",
        ),
      });
      expect(
        result.current.itemGroups.flatMap(([, list]) => list),
      ).toHaveLength(4);
      expect(() => renderHook(useList)).toThrow(/outside provider/);
    });
  });
}
it.each(["user", "workspace"])(
  "edits a %s permission, sends both IDs and restores the original after failure",
  async (kind) => {
    const user = userEvent.setup();
    render(
      kind === "user" ? (
        <UserEditPermissionListTablePermissionCell
          userId="user"
          workspace={
            { id: "workspace", name: "Workspace", userRole: "user" } as any
          }
        />
      ) : (
        <WorkspaceEditPermissionListTablePermissionCell
          workspaceId="workspace"
          user={{ id: "user", name: "User", workspaceRole: "user" } as any}
        />
      ),
    );
    screen.getByRole("combobox").focus();
    await user.keyboard("[ArrowDown]");
    await user.click(await screen.findByRole("option", { name: "editor" }));
    expect(client.execute).toHaveBeenCalledWith({
      role: "editor",
      userId: "user",
      workspaceId: "workspace",
    });
    expect(screen.getByRole("combobox").textContent).toContain("editor");
    act(() => client.actionOptions.onError());
    expect(screen.getByRole("combobox").textContent).toContain("user");
  },
);
