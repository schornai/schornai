// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ actions: {} as Record<string, any> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../../apps/web/app/(main)/app/xrag/_actions/deleteXRAGExport", () => ({
  deleteXRAGExport: { actionName: "deleteExport" },
}));
vi.mock("../../apps/web/app/(main)/app/xrag/_actions/cancelXRAGExport", () => ({
  cancelXRAGExport: { actionName: "cancelExport" },
}));
vi.mock(
  "../../apps/web/app/(main)/app/xrag/_actions/getXRAGExportDownload",
  () => ({ getXRAGExportDownload: { actionName: "downloadExport" } }),
);
vi.mock("next-i18next/client", () => ({
  useT: () => ({ t: (key: string) => key }),
}));
vi.mock("next-safe-action/hooks", () => ({
  useAction: (action: any, callbacks: any) => {
    const value = (state.actions[action.actionName] ??= {
      execute: vi.fn(),
      reset: vi.fn(),
      result: {},
      isPending: false,
      hasErrored: false,
      hasSucceeded: false,
    });
    value.callbacks = callbacks;
    return value;
  },
}));
vi.mock("../../apps/web/app/(main)/app/xrag/_actions/exportXRAG", () => ({
  exportXRAG: { actionName: "export" },
}));
vi.mock(
  "../../apps/web/app/(main)/app/xrag/_actions/getResourceIdentity",
  () => ({ getResourceIdentity: { actionName: "get" } }),
);
vi.mock(
  "../../apps/web/app/(main)/app/xrag/_actions/setResourceIdentity",
  () => ({ setResourceIdentity: { actionName: "set" } }),
);
import { XRAGExportButton } from "../../apps/web/app/_components/xrag/XRAGExportButton";
import { XRAGIdentitySettings } from "../../apps/web/app/_components/xrag/XRAGIdentitySettings";
beforeEach(() => {
  state.actions = {};
});
afterEach(cleanup);
const button = (name: string) =>
  screen.getByRole("button", { name }) as HTMLButtonElement;
it("starts the model download as soon as the single-click export succeeds", async () => {
  const assign = vi.fn();
  vi.stubGlobal("location", { assign });
  try {
    render(<XRAGExportButton kind="model" id="model" />);
    await userEvent.click(button("labelExport"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(state.actions.export.execute).toHaveBeenCalledExactlyOnceWith({
      kind: "model",
      id: "model",
    });
    expect(assign).not.toHaveBeenCalled();
    state.actions.export.callbacks.onSuccess({
      data: { url: "https://storage.test/model" },
    });
    expect(assign).toHaveBeenCalledExactlyOnceWith(
      "https://storage.test/model",
    );
  } finally {
    vi.unstubAllGlobals();
  }
});
it("disables repeat exports while pending and allows retry after failure", async () => {
  const view = render(<XRAGExportButton kind="model" id="model" />);
  state.actions.export.isPending = true;
  view.rerender(<XRAGExportButton kind="model" id="model" />);
  await userEvent.click(button("labelExport"));
  expect(state.actions.export.execute).not.toHaveBeenCalled();
  state.actions.export.isPending = false;
  state.actions.export.hasErrored = true;
  view.rerender(<XRAGExportButton kind="model" id="model" />);
  expect(screen.getByRole("alert").textContent).toBe("errorAction");
  await userEvent.click(button("labelExport"));
  expect(state.actions.export.execute).toHaveBeenCalledTimes(1);
});
it("edits readable identifiers in settings with stale-value protection", () => {
  render(<XRAGIdentitySettings kind="agent" id="agent" />);
  expect(screen.queryByRole("alert")).toBeNull();
  expect(state.actions.get.execute).toHaveBeenCalledWith({
    kind: "agent",
    id: "agent",
  });
  act(() =>
    state.actions.get.callbacks.onSuccess({ data: { globalId: "my-agent" } }),
  );
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Invalid Title" },
  });
  expect(screen.getByRole("alert").textContent).toBe("errorGlobalId");
  expect(button("labelSaveId").disabled).toBe(true);
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "team/my_agent-2" },
  });
  expect(screen.queryByRole("alert")).toBeNull();
  fireEvent.click(button("labelSaveId"));
  expect(state.actions.set.execute).toHaveBeenCalledWith({
    kind: "agent",
    id: "agent",
    globalId: "team/my_agent-2",
    expectedGlobalId: "my-agent",
  });
  act(() =>
    state.actions.set.callbacks.onSuccess({
      data: { globalId: "team/my_agent-2" },
    }),
  );
  expect(button("labelSaveId").disabled).toBe(true);
});
vi.mock(
  "../../apps/web/app/(main)/app/xrag/_actions/getXRAGPackageOptions",
  () => ({
    getXRAGPackageOptions: { actionName: "options" },
  }),
);
vi.mock(
  "../../apps/web/app/(main)/app/xrag/_actions/createXRAGPackage",
  () => ({
    createXRAGPackage: { actionName: "createPackage" },
  }),
);
vi.mock(
  "../../apps/web/app/(main)/app/xrag/_actions/addXRAGPackageItem",
  () => ({ addXRAGPackageItem: { actionName: "addItem" } }),
);
vi.mock(
  "../../apps/web/app/(main)/app/xrag/_actions/deleteXRAGPackage",
  () => ({
    deleteXRAGPackage: { actionName: "deletePackage" },
  }),
);
vi.mock(
  "../../apps/web/app/(main)/app/xrag/_actions/removeXRAGPackageItem",
  () => ({ removeXRAGPackageItem: { actionName: "removeItem" } }),
);
vi.mock(
  "../../apps/web/app/(main)/app/xrag/_actions/exportXRAGPackage",
  () => ({
    exportXRAGPackage: { actionName: "exportPackage" },
  }),
);
import { XRAGPackageAddDialog } from "../../apps/web/app/_components/xrag/XRAGPackageAddDialog";
import { XRAGPackages } from "../../apps/web/app/(main)/app/xrag/_components/XRAGPackages";
const packageId = "11111111-1111-4111-8111-111111111111";
it("offers existing XRAG-Packages and adds only checked connected objects", async () => {
  const view = render(<XRAGPackageAddDialog kind="agent" id="agent" />);
  await userEvent.click(button("labelAdd"));
  expect(state.actions.options.execute).toHaveBeenCalledWith({
    kind: "agent",
    id: "agent",
  });
  const data = {
    packages: [{ id: packageId, name: "Support" }],
    related: [
      { kind: "documentRepository", id: "docs", name: "Files" },
      { kind: "transcriber", id: "speech", name: "Speech" },
      { kind: "model", id: "model", name: "Model" },
    ],
  };
  state.actions.options.result = { data };
  act(() => state.actions.options.callbacks.onSuccess({ data }));
  view.rerender(<XRAGPackageAddDialog kind="agent" id="agent" />);
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(screen.queryByRole("link", { name: "labelCreate" })).toBeNull();
  const choices = screen.getAllByRole("checkbox");
  fireEvent.click(choices[0]);
  fireEvent.click(choices[1]);
  fireEvent.click(choices[1]);
  fireEvent.click(button("labelAdd"));
  expect(state.actions.addItem.execute).toHaveBeenCalledWith({
    packageId,
    selection: { kind: "agent", id: "agent" },
    related: [{ kind: "documentRepository", id: "docs" }],
  });
  act(() => state.actions.addItem.callbacks.onSuccess({}));
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("links to the export page when the user has no packages", async () => {
  const view = render(<XRAGPackageAddDialog kind="model" id="model" />);
  await userEvent.click(button("labelAdd"));
  state.actions.options.result = { data: { packages: [], related: [] } };
  view.rerender(<XRAGPackageAddDialog kind="model" id="model" />);
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(screen.queryByRole("combobox")).toBeNull();
  expect(
    screen.getByRole("link", { name: "labelCreate" }).getAttribute("href"),
  ).toBe("/app/xrag/export");
});

it("shows dependency loading failures with retry instead of a misleading empty state", async () => {
  const view = render(<XRAGPackageAddDialog kind="model" id="model" />);
  await userEvent.click(button("labelAdd"));
  state.actions.options.hasErrored = true;
  view.rerender(<XRAGPackageAddDialog kind="model" id="model" />);
  expect(screen.getByText("errorLoad")).toBeTruthy();
  expect(screen.queryByText("descriptionNoPackages")).toBeNull();
  fireEvent.click(button("labelRetry"));
  expect(state.actions.options.execute).toHaveBeenCalledTimes(2);
});
it("keeps the chosen package after a failed addition and opens it after a successful retry", async () => {
  const dialog = <XRAGPackageAddDialog kind="agent" id="agent" />;
  const view = render(dialog);
  const refresh = () =>
    view.rerender(<XRAGPackageAddDialog kind="agent" id="agent" />);
  await userEvent.click(button("labelAdd"));
  state.actions.options.isPending = true;
  refresh();
  expect(screen.getByRole("status").textContent).toBe("labelLoading");

  const data = {
    packages: [
      { id: packageId, name: "Support" },
      { id: "second", name: "Training" },
    ],
    related: [],
  };
  Object.assign(state.actions.options, { isPending: false, result: { data } });
  act(() => state.actions.options.callbacks.onSuccess({ data }));
  refresh();
  expect(button("labelAdd").disabled).toBe(true);
  await userEvent.click(screen.getByRole("combobox"));
  await userEvent.click(await screen.findByRole("option", { name: "Support" }));
  await userEvent.click(button("labelAdd"));
  state.actions.addItem.isPending = true;
  refresh();
  await userEvent.keyboard("{Escape}");
  expect(screen.getByRole("dialog")).toBeTruthy();
  Object.assign(state.actions.addItem, { isPending: false, hasErrored: true });
  refresh();
  expect(screen.getByRole("alert").textContent).toBe("errorAdd");
  expect(screen.getByRole("combobox").textContent).toContain("Support");
  await userEvent.click(button("labelAdd"));
  expect(state.actions.addItem.execute).toHaveBeenCalledTimes(2);
  Object.assign(state.actions.addItem, {
    hasErrored: false,
    hasSucceeded: true,
    input: { packageId },
  });
  act(() => state.actions.addItem.callbacks.onSuccess({}));
  expect(button("labelOpenPackage").getAttribute("href")).toBe(
    `/app/xrag/export#xrag-package-${packageId}`,
  );
});
it("queues saved packages and confirms removal without deleting source objects", async () => {
  const packages = [
    {
      id: packageId,
      name: "Support",
      xrag_package_items: [
        {
          kind: "agent",
          resource_id: "agent",
          name: "Agent",
        },
      ],
    },
  ];
  render(<XRAGPackages packages={packages} />);
  expect(
    document
      .getElementById(`xrag-package-${packageId}`)
      ?.contains(screen.getByRole("heading", { name: "Support" })),
  ).toBe(true);
  fireEvent.click(button("labelExport"));
  expect(state.actions.exportPackage.execute).toHaveBeenCalledWith({
    packageId,
  });
  await userEvent.click(button("labelRemove"));
  expect(screen.getByRole("alertdialog")).toBeTruthy();
  await userEvent.click(button("labelCancel"));
  expect(state.actions.removeItem.execute).not.toHaveBeenCalled();
  await userEvent.click(button("labelRemove"));
  fireEvent.click(button("labelConfirm"));
  expect(state.actions.removeItem.execute).toHaveBeenCalledWith({
    packageId,
    selection: { kind: "agent", id: "agent" },
  });
  act(() => state.actions.removeItem.callbacks.onSuccess({}));
  await userEvent.click(button("labelDelete"));
  fireEvent.click(button("labelConfirm"));
  expect(state.actions.deletePackage.execute).toHaveBeenCalledWith({
    packageId,
  });
  act(() => state.actions.deletePackage.callbacks.onSuccess({}));
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("keeps package names on failure and clears them only after creation succeeds", () => {
  const view = render(
    <XRAGPackages
      packages={[{ id: packageId, name: "Empty", xrag_package_items: [] }]}
    />,
  );
  expect(button("labelExport").disabled).toBe(true);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Draft" } });
  state.actions.createPackage.hasErrored = true;
  view.rerender(
    <XRAGPackages
      packages={[{ id: packageId, name: "Empty", xrag_package_items: [] }]}
    />,
  );
  expect(screen.getByRole("textbox").getAttribute("value")).toBe("Draft");
  fireEvent.click(button("labelCreate"));
  expect(state.actions.createPackage.execute).toHaveBeenCalledWith({
    name: "Draft",
  });
  act(() =>
    state.actions.createPackage.callbacks.onSuccess({
      data: { id: packageId },
    }),
  );
  expect(screen.getByRole("textbox").getAttribute("value")).toBe("");
});

it("lists models alongside other saved package entries without selecting a model on the export page", () => {
  render(
    <XRAGPackages
      packages={[
        {
          id: packageId,
          name: "Support",
          xrag_package_items: [
            {
              kind: "model",
              name: "My model",
              resource_id: "model",
            },
          ],
        },
      ]}
    />,
  );
  expect(screen.getByText("My model")).toBeTruthy();
  expect(screen.getByText("kind.model")).toBeTruthy();
  expect(screen.queryByRole("combobox")).toBeNull();
  expect(screen.queryByRole("button", { name: "labelAdd" })).toBeNull();
});
it("restores job progress and offers cancellation, download or deletion by state", async () => {
  const base = {
    id: packageId,
    package_id: packageId,
    name: "saved.xrag.tar",
    attempts: 1,
    bytes_uploaded: 60 * 1024 ** 3,
    total_bytes: 120 * 1024 ** 3,
    created_at: "2026-11-16T00:00:00Z",
    updated_at: "2026-11-16T00:00:00Z",
  };
  const view = render(
    <XRAGPackages
      packages={[]}
      jobs={[{ ...base, state: "queued", attempts: 0 }]}
    />,
  );
  expect(screen.getByRole("status").textContent).toBe("state_queued");
  view.rerender(
    <XRAGPackages packages={[]} jobs={[{ ...base, state: "queued" }]} />,
  );
  expect(screen.getByRole("status").textContent).toBe("state_retrying");
  view.rerender(
    <XRAGPackages packages={[]} jobs={[{ ...base, state: "processing" }]} />,
  );
  expect(screen.getByRole("status").textContent).toBe("state_uploading · 50%");
  expect(screen.queryByRole("button", { name: "labelDelete" })).toBeNull();
  fireEvent.click(button("labelCancel"));
  expect(state.actions.cancelExport.execute).toHaveBeenCalledWith({
    jobId: packageId,
  });
  expect(screen.queryByRole("button", { name: "labelDownload" })).toBeNull();
  view.rerender(
    <XRAGPackages packages={[]} jobs={[{ ...base, state: "finished" }]} />,
  );
  expect(screen.queryByRole("button", { name: "labelCancel" })).toBeNull();
  fireEvent.click(button("labelDownload"));
  expect(state.actions.downloadExport.execute).toHaveBeenCalledWith({
    jobId: packageId,
  });
  await userEvent.click(button("labelDelete"));
  expect(state.actions.deleteExport.execute).not.toHaveBeenCalled();
  await userEvent.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: "labelDelete",
    }),
  );
  expect(state.actions.deleteExport.execute).toHaveBeenCalledExactlyOnceWith({
    jobId: packageId,
  });
});

it.each(["agent", "documentRepository", "transcriber", "automation"] as const)(
  "exports a single %s with its own kind",
  async (kind) => {
    render(<XRAGExportButton kind={kind} id="resource" />);
    await userEvent.click(button("labelExport"));
    expect(state.actions.export.execute).toHaveBeenCalledWith({
      kind,
      id: "resource",
    });
  },
);
