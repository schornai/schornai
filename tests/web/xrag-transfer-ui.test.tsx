// @vitest-environment jsdom
import { SidebarProvider } from "@schornio/aibox-package-ui/components/sidebar";
import userEvent from "@testing-library/user-event";

import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
vi.mock("next-i18next/client", () => ({
  useT: () => ({ t: (key: string) => key }),
}));
const state = vi.hoisted(() => ({
  actions: {} as Record<string, any>,
  uploads: [] as any[],
  queue: vi.fn(),
  provider: vi.fn(),
  drop: vi.fn(),
  clear: vi.fn(),
  params: new URLSearchParams(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => state.params,
  usePathname: () => "/app/xrag",
}));
vi.mock("@/lib/groupSortView/action", () => ({
  savePreferences: { actionName: "preferences" },
}));
vi.mock("next-safe-action/hooks", () => ({
  useAction: (action: any, callbacks: any) => {
    const key = action.actionName;
    const value = (state.actions[key] ??= {
      execute: vi.fn(),
      reset: vi.fn(),
      result: {},
      isPending: false,
      hasErrored: false,
      hasSucceeded: false,
    });
    value.executeAsync ??= (...args: unknown[]) => {
      value.execute(...args);
      return Promise.resolve({});
    };
    value.callbacks = callbacks;
    return value;
  },
}));
vi.mock(
  "../../apps/web/app/(main)/app/xrag/_actions/previewXRAGImport",
  () => ({ previewXRAGImport: { actionName: "preview" } }),
);
vi.mock("../../apps/web/app/(main)/app/xrag/_actions/importXRAG", () => ({
  importXRAG: { actionName: "import" },
}));
vi.mock("../../apps/web/app/_components/xrag/XRAGExportButton", () => ({
  XRAGExportButton: ({ id }: any) => <button>Export {id}</button>,
}));
vi.mock("../../apps/web/app/_components/FileUploadProvider", () => ({
  FileUploadProvider: ({ children, ...props }: any) => {
    state.provider(props);
    return children;
  },
  useFileUpload: () => ({
    uploads: state.uploads,
    queueFileUploadsByFileList: state.queue,
    queueFileUploadsByDataTransfer: state.drop,
    clearFinished: state.clear,
  }),
}));

vi.mock(
  "../../apps/web/app/(main)/app/xrag/_actions/inspectXRAGTransfer",
  () => ({ inspectXRAGTransfer: { actionName: "inspect" } }),
);
vi.mock(
  "../../apps/web/app/(main)/app/xrag/_actions/prepareXRAGUpload",
  () => ({ prepareXRAGUpload: { actionName: "prepare" } }),
);
import { XRAGTransfer } from "../../apps/web/app/(main)/app/xrag/_components/XRAGTransfer";
import { XRAGImportUpload } from "../../apps/web/app/(main)/app/xrag/_components/XRAGImportUpload";
const source = { path: "user/one/archive.tar", name: "one.tar" };
const props = {
  uploadId: "11111111-1111-4111-8111-111111111111",
  isAdmin: false,
  workspaces: [{ id: "workspace", name: "Workspace name" }],
};
const archive = (id: string) => ({
  id,
  state: "success",
  objectName: `user/${id}/archive.tar`,
  file: { name: `${id}.tar`, size: 1234 },
});
beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  state.actions = {};
  state.uploads = [];
  state.params = new URLSearchParams();
  vi.clearAllMocks();
});
afterEach(cleanup);
function button(name: string) {
  return screen.getByRole("button", { name }) as HTMLButtonElement;
}
const entries = [
  {
    archiveId: "a".repeat(64),
    id: "agent",
    name: "Agent",
    kind: "agent",
    description: "Helps",
    needsWorkspace: true,
    revision: null,
  },
  {
    archiveId: "b".repeat(64),
    id: "model",
    name: "Model",
    kind: "ollamaModel",
    description: "",
    needsWorkspace: false,
    revision: null,
  },
];
function loaded(options = props) {
  state.uploads = [archive("one")];
  const view = render(<XRAGTransfer {...options} />, {
    wrapper: SidebarProvider,
  });
  const data = { source, digest: "digest", entries };
  act(() => {
    state.actions.inspect.result = { data };
    state.actions.inspect.callbacks.onSuccess({
      data,
      input: { uploadId: options.uploadId },
    });
  });
  view.rerender(<XRAGTransfer {...options} />);
  return view;
}
function review(view: any, externalModels: any[] = [], conflicts: any[] = []) {
  act(() => {
    state.actions.preview.result = {
      data: { digest: "digest", entries: conflicts, externalModels },
    };
    state.actions.preview.callbacks.onSuccess({
      data: state.actions.preview.result.data,
      input: state.actions.preview.execute.mock.calls.at(-1)?.[0] ?? {
        source: { path: "user/one/archive.tar" },
        target: { workspaceId: "workspace" },
        selectedEntries: entries.map((entry) => entry.archiveId),
      },
    });
  });
  view.rerender(<XRAGTransfer {...props} />);
}
it("keeps one active upload visible through preparation and restores the picker on failure", () => {
  const upload = archive(props.uploadId);
  const view = render(<XRAGImportUpload userId="user" />);
  const input = screen.getByLabelText("labelUpload") as HTMLInputElement;
  const files = [new File(["archive"], "upload.xrag.tar")];
  fireEvent.change(input, { target: { files } });
  expect(state.queue).toHaveBeenCalledWith(files);
  state.uploads = [{ ...upload, state: "uploading", progress: 0.5 }];
  view.rerender(<XRAGImportUpload userId="user" />);
  expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
    "0.5",
  );
  expect(screen.getByText(upload.file.name)).toBeTruthy();
  expect(input.disabled).toBe(true);
  act(() => state.provider.mock.lastCall![0].onFileUploadSuccess(upload));
  expect(state.actions.prepare.execute).toHaveBeenCalledExactlyOnceWith({
    path: upload.objectName,
  });
  state.uploads = [upload];
  state.actions.prepare.isPending = true;
  view.rerender(<XRAGImportUpload userId="user" />);
  expect(screen.getByRole("status").textContent).toBe("descriptionInspecting");
  expect(screen.getByText(upload.file.name)).toBeTruthy();
  expect(screen.queryByText("labelUpload")).toBeNull();
  expect(input.disabled).toBe(true);
  state.actions.prepare.isPending = false;
  state.actions.prepare.hasErrored = true;
  view.rerender(<XRAGImportUpload userId="user" />);
  expect(screen.getByText("errorAction")).toBeTruthy();
  expect(screen.getByLabelText("labelAnotherUpload")).toBe(input);
  expect(input.disabled).toBe(false);
});
it("shows cards, selects entries individually, and only asks for a workspace when needed", () => {
  const view = loaded();
  expect(screen.getByRole("heading", { name: "Agent" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Model" })).toBeTruthy();
  expect(screen.getByRole("combobox", { name: "labelWorkspace" })).toBeTruthy();
  const choices = screen.getAllByRole("button", {
    name: "labelSelectNamed",
    pressed: true,
  });
  fireEvent.click(choices[0]!);
  expect(screen.queryByRole("combobox", { name: "labelWorkspace" })).toBeNull();
  fireEvent.click(button("labelImport"));
  expect(state.actions.preview.execute).toHaveBeenCalledWith({
    source: { path: "user/one/archive.tar", digest: "digest" },
    target: undefined,
    selectedEntries: [entries[1]!.archiveId],
  });
  review(view);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(state.actions.import.execute).toHaveBeenCalledWith({
    source: { path: "user/one/archive.tar", digest: "digest" },
    target: undefined,
    selectedEntries: [entries[1]!.archiveId],
    confirmedRevisions: {},
    modelSelections: {},
  });
});
it("supports select none/all and uses one workspace for all selected resources", () => {
  loaded();
  fireEvent.click(button("labelSelectNone"));
  expect(button("labelImport").disabled).toBe(true);
  expect(screen.queryByRole("combobox")).toBeNull();
  fireEvent.click(button("labelSelectAll"));
  fireEvent.click(button("labelImport"));
  expect(state.actions.preview.execute).toHaveBeenCalledWith(
    expect.objectContaining({
      target: { workspaceId: "workspace" },
      selectedEntries: entries.map((e) => e.archiveId),
    }),
  );
});
it("requires replacement confirmation and prevents duplicate commits", () => {
  const view = loaded();
  review(view, [], [{ id: "agent", name: "Agent", revision: "revision" }]);
  expect(button("labelImport").disabled).toBe(true);
  fireEvent.click(screen.getByRole("checkbox", { name: "labelReplace" }));
  expect(button("labelImport").disabled).toBe(false);
  state.actions.import.isPending = true;
  view.rerender(<XRAGTransfer {...props} />);
  expect(button("labelImport").disabled).toBe(true);
  state.actions.import.isPending = false;
  view.rerender(<XRAGTransfer {...props} />);
  fireEvent.click(button("labelImport"));
  expect(state.actions.import.execute).toHaveBeenCalledWith(
    expect.objectContaining({ confirmedRevisions: { agent: "revision" } }),
  );
});
it("asks for ambiguous external models and sends the chosen existing connection", async () => {
  const view = loaded();
  review(view, [
    {
      sourceIdentifier: "external:source",
      provider: "openai",
      modelId: "gpt-test",
      selectedIdentifier: null,
      candidates: [
        { identifier: "external:first", name: "First" },
        { identifier: "external:second", name: "Second" },
      ],
    },
  ]);
  expect(button("labelImport").disabled).toBe(true);
  await userEvent.click(
    screen.getByRole("combobox", { name: "openai · gpt-test" }),
  );
  await userEvent.click(
    await screen.findByRole("option", { name: "Second · external:second" }),
  );
  fireEvent.click(button("labelImport"));
  expect(state.actions.import.execute).toHaveBeenCalledWith(
    expect.objectContaining({
      modelSelections: { "external:source": "external:second" },
    }),
  );
});
it("does not block missing external models and uses unique matches automatically", () => {
  const view = loaded();
  review(view, [
    {
      sourceIdentifier: "missing",
      provider: "openai",
      modelId: "missing",
      selectedIdentifier: null,
      candidates: [],
    },
    {
      sourceIdentifier: "known",
      provider: "openai",
      modelId: "known",
      selectedIdentifier: "destination",
      candidates: [{ identifier: "destination", name: "Existing" }],
    },
  ]);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(state.actions.import.execute).toHaveBeenCalledWith(
    expect.objectContaining({ modelSelections: { known: "destination" } }),
  );
});
it.each(["inspect", "preview", "import"])(
  "links to a new XRAG upload after a %s error",
  (action) => {
    const view = loaded();
    state.actions[action].hasErrored = true;
    view.rerender(<XRAGTransfer {...props} />);
    expect(screen.getByText("errorAction")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "labelAnotherUpload" })
        .getAttribute("href"),
    ).toBe("/app/xrag/import");
  },
);

it("requires a name when creating a new workspace and submits one target for the selection", async () => {
  const adminProps = { ...props, isAdmin: true, workspaces: [] };
  const view = loaded(adminProps);
  expect(button("labelImport").disabled).toBe(true);
  await userEvent.click(
    screen.getByRole("combobox", { name: "labelWorkspace" }),
  );
  await userEvent.click(
    await screen.findByRole("option", { name: "labelNewWorkspace" }),
  );
  expect(button("labelImport").disabled).toBe(true);
  fireEvent.change(screen.getByRole("textbox", { name: "labelName" }), {
    target: { value: "New team" },
  });
  expect(button("labelImport").disabled).toBe(false);
  fireEvent.click(button("labelImport"));
  expect(state.actions.preview.execute).toHaveBeenCalledWith(
    expect.objectContaining({
      target: { workspaceId: expect.any(String), newWorkspaceName: "New team" },
    }),
  );
  state.actions.import.hasSucceeded = true;
  view.rerender(<XRAGTransfer {...adminProps} />);
  expect(screen.getByText("descriptionImported")).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: "labelAnotherUpload" })
      .getAttribute("href"),
  ).toBe("/app/xrag/import");
  expect(screen.queryByRole("button", { name: "labelImport" })).toBeNull();
});
it("allows another upload after a transfer failure", () => {
  state.uploads = [{ ...archive("failed"), state: "error" }];
  render(<XRAGImportUpload userId="user" />);
  expect(screen.getByText("errorUpload")).toBeTruthy();
  expect(
    (screen.getByLabelText("labelAnotherUpload") as HTMLInputElement).disabled,
  ).toBe(false);
  expect(state.actions.prepare.execute).not.toHaveBeenCalled();
});
it("only mounts header options for inspected contents and preserves selection when switching views", async () => {
  const renderTransfer = () => <XRAGTransfer {...props} />;
  const view = render(renderTransfer(), { wrapper: SidebarProvider });
  expect(screen.queryByRole("button", { name: "labelOptions" })).toBeNull();
  const data = { source, digest: "digest", entries };
  act(() => {
    state.actions.inspect.result = { data };
    state.actions.inspect.callbacks.onSuccess({
      data,
      input: { source: source },
    });
  });
  view.rerender(renderTransfer());
  expect(button("labelOptions")).toBeTruthy();
  expect(state.actions.inspect.execute).toHaveBeenCalledExactlyOnceWith({
    uploadId: props.uploadId,
  });
  expect(screen.queryByRole("link", { name: "labelAnotherUpload" })).toBeNull();
  fireEvent.click(
    screen.getAllByRole("button", {
      name: "labelSelectNamed",
      pressed: true,
    })[0]!,
  );
  state.params.set("view", "table");
  view.rerender(renderTransfer());
  expect(screen.getByRole("table")).toBeTruthy();
  expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(1);
  fireEvent.click(button("labelSelectAll"));
  expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(2);
  fireEvent.click(button("labelSelectNone"));
  expect(button("labelImport").disabled).toBe(true);
  state.actions.import.hasSucceeded = true;
  view.rerender(renderTransfer());
  expect(screen.queryByRole("button", { name: "labelOptions" })).toBeNull();
});
it("starts a single platform import only on click, including after refresh", () => {
  const prepared = {
    source,
    digest: "digest",
    isCollection: false,
    entries: [{ ...entries[1]!, kind: "setup" as const, size: 4498595328 }],
  };
  const mount = () =>
    render(<XRAGTransfer {...props} prepared={prepared} />, {
      wrapper: SidebarProvider,
    });
  mount().unmount();
  mount();
  expect(state.actions.preview.execute).not.toHaveBeenCalled();
  expect(state.actions.import.execute).not.toHaveBeenCalled();
  fireEvent.click(button("labelImport"));
  expect(state.actions.preview.execute).toHaveBeenCalledExactlyOnceWith({
    source: { path: source.path, digest: "digest" },
    target: undefined,
    selectedEntries: [entries[1]!.archiveId],
  });
});

it.each([
  ["inspecting", "descriptionInspecting"],
  ["inspection_failed", "errorAction"],
  ["applying", "descriptionImporting"],
  ["committed", "descriptionImported"],
  ["rolled_back", "errorAction"],
] as const)(
  "restores %s without inspecting or submitting another import",
  (status, message) => {
    render(<XRAGTransfer {...props} status={status} />, {
      wrapper: SidebarProvider,
    });
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "labelImport" })).toBeNull();
    expect(state.actions.inspect.execute).not.toHaveBeenCalled();
    expect(state.actions.preview.execute).not.toHaveBeenCalled();
    expect(state.actions.import.execute).not.toHaveBeenCalled();
  },
);
it("does not start a single-package import if inspection finishes after leaving", () => {
  const view = render(<XRAGTransfer {...props} />, {
    wrapper: SidebarProvider,
  });
  const { onSuccess } = state.actions.inspect.callbacks;
  view.unmount();
  act(() =>
    onSuccess({
      input: { source: source },
      data: {
        source,
        digest: "digest",
        isCollection: false,
        entries: [entries[1]],
      },
    }),
  );
  expect(state.actions.preview.execute).not.toHaveBeenCalled();
});

it("renders a prepared upload on arrival without scheduling another inspection", () => {
  const prepared = {
    digest: "digest",
    isCollection: true,
    source,
    entries: entries.map((entry) => ({
      ...entry,
      kind: "agent" as const,
      size: 1,
    })),
  };
  render(<XRAGTransfer {...props} prepared={prepared} />, {
    wrapper: SidebarProvider,
  });
  expect(screen.getByRole("heading", { name: "Agent" })).toBeTruthy();
  expect(
    screen.getAllByRole("button", { name: "labelSelectNamed", pressed: true }),
  ).toHaveLength(2);
  expect(state.actions.inspect.execute).not.toHaveBeenCalled();
});
