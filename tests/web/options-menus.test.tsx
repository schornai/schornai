// @vitest-environment jsdom
import "./client-setup";
import { client } from "./client-setup";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  preferences: {} as any,
  group: vi.fn(),
  sort: vi.fn(),
  view: vi.fn(),
  save: vi.fn(),
  reset: vi.fn(),
  upload: vi.fn(),
}));
vi.mock("@/lib/serverActionClient", () => ({
  serverActionClient: {
    inputSchema: () => ({ action: () => vi.fn() }),
    action: () => vi.fn(),
  },
}));
vi.mock("../../apps/web/app/_components/FileUploadProvider", () => ({
  useFileUpload: () => ({ queueFileUploadsByFileList: mocks.upload }),
}));
vi.mock("../../apps/web/app/_components/StorageViewProvider", () => ({
  useStorageView: () => mocks.preferences,
}));
import { AudioRecorderProvider } from "../../apps/web/app/_components/AudioRecorderModal";
import { StorageViewOptionsDropdown } from "../../apps/web/app/_components/StorageViewOptionsDropdown";
vi.mock(
  "../../apps/web/app/(settings)/settings/user/_components/UserListProvider",
  () => ({ useUserList: () => mocks.preferences }),
);
import { UserListOptionsDropdown } from "../../apps/web/app/(settings)/settings/user/_components/UserListOptionsDropdown";
vi.mock(
  "../../apps/web/app/(settings)/settings/user/[userId]/_components/UserEditPermissionListProvider",
  () => ({ useUserEditPermissionList: () => mocks.preferences }),
);
import { UserEditPermissionListOptionsDropdown } from "../../apps/web/app/(settings)/settings/user/[userId]/_components/UserEditPermissionListOptionsDropdown";
vi.mock(
  "../../apps/web/app/(settings)/settings/workspace/_components/WorkspaceListProvider",
  () => ({ useWorkspaceList: () => mocks.preferences }),
);
import { WorkspaceListOptionsDropdown } from "../../apps/web/app/(settings)/settings/workspace/_components/WorkspaceListOptionsDropdown";
vi.mock(
  "../../apps/web/app/(settings)/settings/workspace/[workspaceId]/_components/WorkspaceEditPermissionListProvider",
  () => ({ useWorkspaceEditPermissionList: () => mocks.preferences }),
);
import { WorkspaceEditPermissionListOptionsDropdown } from "../../apps/web/app/(settings)/settings/workspace/[workspaceId]/_components/WorkspaceEditPermissionListOptionsDropdown";
vi.mock(
  "../../apps/web/app/(main)/agent/_components/AgentListProvider",
  () => ({ useAgentList: () => mocks.preferences }),
);
import { AgentListOptionsDropdown } from "../../apps/web/app/(main)/agent/_components/AgentListOptionsDropdown";
vi.mock(
  "../../apps/web/app/(main)/activity/_components/ActivityListProvider",
  () => ({ useActivityList: () => mocks.preferences }),
);
import { ActivityListOptionsDropdown } from "../../apps/web/app/(main)/activity/_components/ActivityListOptionsDropdown";
vi.mock(
  "../../apps/web/app/(main)/app/transcribe/_components/TranscriberListProvider",
  () => ({ useTranscriberList: () => mocks.preferences }),
);
import { TranscriberListOptionsDropdown } from "../../apps/web/app/(main)/app/transcribe/_components/TranscriberListOptionsDropdown";
vi.mock(
  "../../apps/web/app/(main)/app/documents/_components/DocumentRepositoryListProvider",
  () => ({ useDocumentRepositoryList: () => mocks.preferences }),
);
import { DocumentRepositoryListOptionsDropdown } from "../../apps/web/app/(main)/app/documents/_components/DocumentRepositoryListOptionsDropdown";

afterEach(cleanup);
beforeEach(() => {
  for (const mock of Object.values(mocks))
    if (vi.isMockFunction(mock)) mock.mockReset();
  client.push.mockClear();
  client.execute.mockReset().mockResolvedValue({});
  mocks.preferences = {
    canWrite: true,
    group: "no-group",
    sort: "name:asc",
    view: "table",
    setGroup: mocks.group,
    setSort: mocks.sort,
    setView: mocks.view,
    savePreferences: mocks.save,
    resetPreferences: mocks.reset,
    isUserPreferences: false,
    basePathApp: "/files",
    basePathStorage: "/folder",
    storage: { type: "activity", activityId: "activity", agentId: "agent" },
  };
});
describe("StorageViewOptionsDropdown", () => {
  it("offers and selects column browsing for document repositories", async () => {
    mocks.preferences.storage = {
      type: "documentRepository",
      documentRepositoryId: "repository",
    };
    const user = userEvent.setup();
    render(<StorageViewOptionsDropdown />);
    act(() => screen.getByRole("button", { name: "labelOptions" }).focus());
    await user.keyboard("[ArrowDown]");
    act(() => screen.getByRole("menuitem", { name: "labelView" }).focus());
    await user.keyboard("[ArrowRight]");
    await user.click(
      await screen.findByRole("menuitemradio", { name: "labelColumns" }),
    );
    expect(mocks.view).toHaveBeenCalledWith("columns");
  });
  it("opens preferences and invokes save and reset", async () => {
    render(<StorageViewOptionsDropdown />);
    fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
    await screen.findByRole("menu");
    fireEvent.click(screen.getByRole("button", { name: "labelSaveView" }));
    expect(mocks.save).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "labelReset" }));
    expect(mocks.reset).toHaveBeenCalledOnce();
  });
  it.each(["labelSort", "labelGroup", "labelView"])(
    "changes %s through the radio submenu",
    async (label) => {
      const user = userEvent.setup();
      render(<StorageViewOptionsDropdown />);
      act(() => screen.getByRole("button", { name: "labelOptions" }).focus());
      await user.keyboard("[ArrowDown]");
      const trigger = await screen.findByRole("menuitem", { name: label });
      act(() => trigger.focus());
      await user.keyboard("[ArrowRight]");
      const option = await screen.findAllByRole("menuitemradio");
      await user.click(option.at(-1)!);
      expect(
        label === "labelSort"
          ? mocks.sort
          : label === "labelGroup"
            ? mocks.group
            : mocks.view,
      ).toHaveBeenCalledWith(expect.any(String));
    },
  );
  it("hides save and reset for the current saved preferences", async () => {
    mocks.preferences.isUserPreferences = true;
    render(<StorageViewOptionsDropdown />);
    fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
    await screen.findByRole("menu");
    expect(screen.queryByRole("button", { name: "labelSaveView" })).toBeNull();
  });
});
describe("UserListOptionsDropdown", () => {
  it("opens preferences and invokes save and reset", async () => {
    render(<UserListOptionsDropdown />);
    fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
    await screen.findByRole("menu");
    fireEvent.click(screen.getByRole("button", { name: "labelSaveView" }));
    expect(mocks.save).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "labelReset" }));
    expect(mocks.reset).toHaveBeenCalledOnce();
  });
  it.each(["labelSort", "labelGroup"])(
    "changes %s through the radio submenu",
    async (label) => {
      const user = userEvent.setup();
      render(<UserListOptionsDropdown />);
      act(() => screen.getByRole("button", { name: "labelOptions" }).focus());
      await user.keyboard("[ArrowDown]");
      const trigger = await screen.findByRole("menuitem", { name: label });
      act(() => trigger.focus());
      await user.keyboard("[ArrowRight]");
      const option = await screen.findAllByRole("menuitemradio");
      await user.click(option.at(-1)!);
      expect(
        label === "labelSort"
          ? mocks.sort
          : label === "labelGroup"
            ? mocks.group
            : mocks.view,
      ).toHaveBeenCalledWith(expect.any(String));
    },
  );
  it("hides save and reset for the current saved preferences", async () => {
    mocks.preferences.isUserPreferences = true;
    render(<UserListOptionsDropdown />);
    fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
    await screen.findByRole("menu");
    expect(screen.queryByRole("button", { name: "labelSaveView" })).toBeNull();
  });
});
describe("UserEditPermissionListOptionsDropdown", () => {
  it("opens preferences and invokes save and reset", async () => {
    render(<UserEditPermissionListOptionsDropdown />);
    fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
    await screen.findByRole("menu");
    fireEvent.click(screen.getByRole("button", { name: "labelSaveView" }));
    expect(mocks.save).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "labelReset" }));
    expect(mocks.reset).toHaveBeenCalledOnce();
  });
  it.each(["labelSort", "labelGroup"])(
    "changes %s through the radio submenu",
    async (label) => {
      const user = userEvent.setup();
      render(<UserEditPermissionListOptionsDropdown />);
      act(() => screen.getByRole("button", { name: "labelOptions" }).focus());
      await user.keyboard("[ArrowDown]");
      const trigger = await screen.findByRole("menuitem", { name: label });
      act(() => trigger.focus());
      await user.keyboard("[ArrowRight]");
      const option = await screen.findAllByRole("menuitemradio");
      await user.click(option.at(-1)!);
      expect(
        label === "labelSort"
          ? mocks.sort
          : label === "labelGroup"
            ? mocks.group
            : mocks.view,
      ).toHaveBeenCalledWith(expect.any(String));
    },
  );
  it("hides save and reset for the current saved preferences", async () => {
    mocks.preferences.isUserPreferences = true;
    render(<UserEditPermissionListOptionsDropdown />);
    fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
    await screen.findByRole("menu");
    expect(screen.queryByRole("button", { name: "labelSaveView" })).toBeNull();
  });
});
describe("WorkspaceListOptionsDropdown", () => {
  it("opens preferences and invokes save and reset", async () => {
    render(<WorkspaceListOptionsDropdown />);
    fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
    await screen.findByRole("menu");
    fireEvent.click(screen.getByRole("button", { name: "labelSaveView" }));
    expect(mocks.save).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "labelReset" }));
    expect(mocks.reset).toHaveBeenCalledOnce();
  });
  it.each(["labelSort", "labelGroup"])(
    "changes %s through the radio submenu",
    async (label) => {
      const user = userEvent.setup();
      render(<WorkspaceListOptionsDropdown />);
      act(() => screen.getByRole("button", { name: "labelOptions" }).focus());
      await user.keyboard("[ArrowDown]");
      const trigger = await screen.findByRole("menuitem", { name: label });
      act(() => trigger.focus());
      await user.keyboard("[ArrowRight]");
      const option = await screen.findAllByRole("menuitemradio");
      await user.click(option.at(-1)!);
      expect(
        label === "labelSort"
          ? mocks.sort
          : label === "labelGroup"
            ? mocks.group
            : mocks.view,
      ).toHaveBeenCalledWith(expect.any(String));
    },
  );
  it("hides save and reset for the current saved preferences", async () => {
    mocks.preferences.isUserPreferences = true;
    render(<WorkspaceListOptionsDropdown />);
    fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
    await screen.findByRole("menu");
    expect(screen.queryByRole("button", { name: "labelSaveView" })).toBeNull();
  });
});
describe("WorkspaceEditPermissionListOptionsDropdown", () => {
  it("opens preferences and invokes save and reset", async () => {
    render(<WorkspaceEditPermissionListOptionsDropdown />);
    fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
    await screen.findByRole("menu");
    fireEvent.click(screen.getByRole("button", { name: "labelSaveView" }));
    expect(mocks.save).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "labelReset" }));
    expect(mocks.reset).toHaveBeenCalledOnce();
  });
  it.each(["labelSort", "labelGroup"])(
    "changes %s through the radio submenu",
    async (label) => {
      const user = userEvent.setup();
      render(<WorkspaceEditPermissionListOptionsDropdown />);
      act(() => screen.getByRole("button", { name: "labelOptions" }).focus());
      await user.keyboard("[ArrowDown]");
      const trigger = await screen.findByRole("menuitem", { name: label });
      act(() => trigger.focus());
      await user.keyboard("[ArrowRight]");
      const option = await screen.findAllByRole("menuitemradio");
      await user.click(option.at(-1)!);
      expect(
        label === "labelSort"
          ? mocks.sort
          : label === "labelGroup"
            ? mocks.group
            : mocks.view,
      ).toHaveBeenCalledWith(expect.any(String));
    },
  );
  it("hides save and reset for the current saved preferences", async () => {
    mocks.preferences.isUserPreferences = true;
    render(<WorkspaceEditPermissionListOptionsDropdown />);
    fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
    await screen.findByRole("menu");
    expect(screen.queryByRole("button", { name: "labelSaveView" })).toBeNull();
  });
});
describe("AgentListOptionsDropdown", () => {
  it("opens preferences and invokes save and reset", async () => {
    render(<AgentListOptionsDropdown />);
    fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
    await screen.findByRole("menu");
    fireEvent.click(screen.getByRole("button", { name: "labelSaveView" }));
    expect(mocks.save).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "labelReset" }));
    expect(mocks.reset).toHaveBeenCalledOnce();
  });
  it.each(["labelSort", "labelGroup", "labelView"])(
    "changes %s through the radio submenu",
    async (label) => {
      const user = userEvent.setup();
      render(<AgentListOptionsDropdown />);
      act(() => screen.getByRole("button", { name: "labelOptions" }).focus());
      await user.keyboard("[ArrowDown]");
      const trigger = await screen.findByRole("menuitem", { name: label });
      act(() => trigger.focus());
      await user.keyboard("[ArrowRight]");
      const option = await screen.findAllByRole("menuitemradio");
      await user.click(option.at(-1)!);
      expect(
        label === "labelSort"
          ? mocks.sort
          : label === "labelGroup"
            ? mocks.group
            : mocks.view,
      ).toHaveBeenCalledWith(expect.any(String));
    },
  );
  it("hides save and reset for the current saved preferences", async () => {
    mocks.preferences.isUserPreferences = true;
    render(<AgentListOptionsDropdown />);
    fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
    await screen.findByRole("menu");
    expect(screen.queryByRole("button", { name: "labelSaveView" })).toBeNull();
  });
});
describe("ActivityListOptionsDropdown", () => {
  it("opens preferences and invokes save and reset", async () => {
    render(<ActivityListOptionsDropdown />);
    fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
    await screen.findByRole("menu");
    fireEvent.click(screen.getByRole("button", { name: "labelSaveView" }));
    expect(mocks.save).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "labelReset" }));
    expect(mocks.reset).toHaveBeenCalledOnce();
  });
  it.each(["labelSort", "labelGroup", "labelView"])(
    "changes %s through the radio submenu",
    async (label) => {
      const user = userEvent.setup();
      render(<ActivityListOptionsDropdown />);
      act(() => screen.getByRole("button", { name: "labelOptions" }).focus());
      await user.keyboard("[ArrowDown]");
      const trigger = await screen.findByRole("menuitem", { name: label });
      act(() => trigger.focus());
      await user.keyboard("[ArrowRight]");
      const option = await screen.findAllByRole("menuitemradio");
      await user.click(option.at(-1)!);
      expect(
        label === "labelSort"
          ? mocks.sort
          : label === "labelGroup"
            ? mocks.group
            : mocks.view,
      ).toHaveBeenCalledWith(expect.any(String));
    },
  );
  it("hides save and reset for the current saved preferences", async () => {
    mocks.preferences.isUserPreferences = true;
    render(<ActivityListOptionsDropdown />);
    fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
    await screen.findByRole("menu");
    expect(screen.queryByRole("button", { name: "labelSaveView" })).toBeNull();
  });
});
describe("TranscriberListOptionsDropdown", () => {
  it("opens preferences and invokes save and reset", async () => {
    render(<TranscriberListOptionsDropdown />);
    fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
    await screen.findByRole("menu");
    fireEvent.click(screen.getByRole("button", { name: "labelSaveView" }));
    expect(mocks.save).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "labelReset" }));
    expect(mocks.reset).toHaveBeenCalledOnce();
  });
  it.each(["labelSort", "labelGroup", "labelView"])(
    "changes %s through the radio submenu",
    async (label) => {
      const user = userEvent.setup();
      render(<TranscriberListOptionsDropdown />);
      act(() => screen.getByRole("button", { name: "labelOptions" }).focus());
      await user.keyboard("[ArrowDown]");
      const trigger = await screen.findByRole("menuitem", { name: label });
      act(() => trigger.focus());
      await user.keyboard("[ArrowRight]");
      const option = await screen.findAllByRole("menuitemradio");
      await user.click(option.at(-1)!);
      expect(
        label === "labelSort"
          ? mocks.sort
          : label === "labelGroup"
            ? mocks.group
            : mocks.view,
      ).toHaveBeenCalledWith(expect.any(String));
    },
  );
  it("hides save and reset for the current saved preferences", async () => {
    mocks.preferences.isUserPreferences = true;
    render(<TranscriberListOptionsDropdown />);
    fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
    await screen.findByRole("menu");
    expect(screen.queryByRole("button", { name: "labelSaveView" })).toBeNull();
  });
});
describe("DocumentRepositoryListOptionsDropdown", () => {
  it("opens preferences and invokes save and reset", async () => {
    render(<DocumentRepositoryListOptionsDropdown />);
    fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
    await screen.findByRole("menu");
    fireEvent.click(screen.getByRole("button", { name: "labelSaveView" }));
    expect(mocks.save).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "labelReset" }));
    expect(mocks.reset).toHaveBeenCalledOnce();
  });
  it.each(["labelSort", "labelGroup", "labelView"])(
    "changes %s through the radio submenu",
    async (label) => {
      const user = userEvent.setup();
      render(<DocumentRepositoryListOptionsDropdown />);
      act(() => screen.getByRole("button", { name: "labelOptions" }).focus());
      await user.keyboard("[ArrowDown]");
      const trigger = await screen.findByRole("menuitem", { name: label });
      act(() => trigger.focus());
      await user.keyboard("[ArrowRight]");
      const option = await screen.findAllByRole("menuitemradio");
      await user.click(option.at(-1)!);
      expect(
        label === "labelSort"
          ? mocks.sort
          : label === "labelGroup"
            ? mocks.group
            : mocks.view,
      ).toHaveBeenCalledWith(expect.any(String));
    },
  );
  it("hides save and reset for the current saved preferences", async () => {
    mocks.preferences.isUserPreferences = true;
    render(<DocumentRepositoryListOptionsDropdown />);
    fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
    await screen.findByRole("menu");
    expect(screen.queryByRole("button", { name: "labelSaveView" })).toBeNull();
  });
});

it("uploads files and creates folders without offering current-folder deletion", async () => {
  const user = userEvent.setup();
  const view = render(<StorageViewOptionsDropdown />);
  const files = [new File(["file"], "file.txt")];
  fireEvent.change(view.container.querySelector("input[type=file]")!, {
    target: { files },
  });
  expect(mocks.upload).toHaveBeenCalledWith(files);
  act(() => screen.getByRole("button", { name: "labelOptions" }).focus());
  await user.keyboard("[ArrowDown]");
  const submenu = await screen.findByRole("menuitem", { name: "labelNew" });
  act(() => submenu.focus());
  await user.keyboard("[ArrowRight]");
  await user.click(
    await screen.findByRole("menuitem", { name: "labelNewFolder" }),
  );
  expect(await screen.findByRole("dialog")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "labelCancel" }));
  act(() => screen.getByRole("button", { name: "labelOptions" }).focus());
  await user.keyboard("[ArrowDown]");
  await screen.findByRole("menu");
  expect(
    screen.queryByRole("menuitem", { name: "labelDeleteFolder" }),
  ).toBeNull();
});

it.each([false, true])(
  "offers a new recording only when a transcriber is configured: %s",
  async (enabled) => {
    const user = userEvent.setup();
    render(
      <AudioRecorderProvider config={enabled ? {} : undefined}>
        <StorageViewOptionsDropdown />
      </AudioRecorderProvider>,
    );
    act(() => screen.getByRole("button", { name: "labelOptions" }).focus());
    await user.keyboard("[ArrowDown]");
    const submenu = await screen.findByRole("menuitem", { name: "labelNew" });
    act(() => submenu.focus());
    await user.keyboard("[ArrowRight]");
    await screen.findByRole("menuitem", { name: "labelNewFolder" });
    if (enabled) {
      await user.click(
        screen.getByRole("menuitem", { name: "labelNewRecording" }),
      );
      expect(await screen.findByRole("dialog")).toBeTruthy();
      expect(screen.getByRole("button", { name: "labelStart" })).toBeTruthy();
    } else {
      expect(
        screen.queryByRole("menuitem", { name: "labelNewRecording" }),
      ).toBeNull();
    }
  },
);
