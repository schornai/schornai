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
import { SidebarProvider } from "../../packages/ui/src/components/sidebar";
import {
  DocumentRepositoryEditor,
  useDocumentRepositoryEditor,
} from "../../apps/web/app/(main)/app/documents/[documentRepositoryId]/_components/DocumentRepositoryEditor";
import {
  TranscriberEditor,
  useTranscriberEditor,
} from "../../apps/web/app/(main)/app/transcribe/[transcriberId]/_components/TranscriberEditor";
import { DocumentRepositoryInfo } from "../../apps/web/app/(main)/app/documents/[documentRepositoryId]/_components/DocumentRepositoryInfo";
import { TranscriberInfo } from "../../apps/web/app/(main)/app/transcribe/_components/TranscriberInfo";
vi.mock(
  "../../apps/web/app/(main)/app/documents/_actions/createDocumentRepository",
  () => ({ createDocumentRepository: vi.fn() }),
);
vi.mock(
  "../../apps/web/app/(main)/app/documents/_actions/updateDocumentRepository",
  () => ({ updateDocumentRepository: vi.fn() }),
);
vi.mock(
  "../../apps/web/app/(main)/app/documents/_actions/deleteDocumentRepository",
  () => ({ deleteDocumentRepository: vi.fn() }),
);
vi.mock(
  "../../apps/web/app/(main)/app/transcribe/_actions/createTranscriber",
  () => ({ createTranscriber: vi.fn() }),
);
vi.mock(
  "../../apps/web/app/(main)/app/transcribe/_actions/updateTranscriber",
  () => ({ updateTranscriber: vi.fn() }),
);
vi.mock(
  "../../apps/web/app/(main)/app/transcribe/_actions/deleteTranscriber",
  () => ({ deleteTranscriber: vi.fn() }),
);
vi.mock("../../apps/web/app/(main)/_actions/updateFavorite", () => ({
  updateFavorite: vi.fn(),
}));
const color = { type: "color-oklch-hue", oklchHue: 100 };
const workspace = {
  id: "workspace",
  name: "Workspace",
  userRole: "editor",
  claim: "workspace-admin",
  description: "Workspace description",
};
const model = {
  id: "embedding",
  identifier: "embedding",
  name: "Embedding",
  type: "ollama_embedding_v1",
  config: { embeddingVectorSize: 768 },
  description: "Embedding description",
};
const whisper = {
  id: "whisper",
  identifier: "whisper",
  name: "Whisper",
  type: "mlx_whisper_v1",
  config: { fileSystemIdentifier: "whisper" },
};
const transcriber = {
  id: "transcriber",
  identifier: "transcriber",
  name: "Transcriber",
  description: "Description",
  prompt: "Transcriber prompt",
  modelIdentifier: "whisper",
  workspaceId: "workspace",
  version: "transcriber-v2",
  color,
  icon: { type: "icon-lucide", iconName: "audio-lines" },
} as any;
const repository = {
  id: "repo",
  identifier: "repo",
  name: "Repository",
  description: "Description",
  workspaceId: "workspace",
  type: "database-v2",
  color,
  icon: { type: "icon-lucide", iconName: "file" },
  transcriberIdentifier: "transcriber",
  index: {
    keyword: { active: true },
    embedding: {
      active: true,
      modelIdentifier: "embedding",
      modelVectorSize: 768,
    },
  },
} as any;
const relations = {
  models: [
    model,
    whisper,
    {
      ...model,
      id: "other-embedding",
      identifier: "other-embedding",
      name: "Small embedding",
      config: { embeddingVectorSize: 256 },
    },
    {
      ...whisper,
      id: "other-whisper",
      identifier: "other-whisper",
      name: "Other whisper",
    },
  ],
  theme: {
    version: "theme-v2",
    colors: [
      { id: "color", name: "Green", color },
      { id: "blue", name: "Blue", color: { ...color, oklchHue: 250 } },
    ],
  },
  workspaces: [
    workspace,
    { ...workspace, id: "second", name: "Second workspace" },
  ],
  transcribers: [transcriber],
} as any;
afterEach(cleanup);
beforeEach(() => {
  client.params = new URLSearchParams();
  client.execute.mockClear();
  client.validationErrors = undefined;
  client.pending = false;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
});

const editors = [
  [
    "repository",
    DocumentRepositoryEditor,
    "documentRepository",
    repository,
    ["default", "features", "settings"],
  ],
  [
    "transcriber",
    TranscriberEditor,
    "transcriber",
    transcriber,
    ["default", "prompt", "settings"],
  ],
] as const;

describe.each(editors)("%s editor", (_name, Component, key, entity, tabs) => {
  const mount = (mode: string, value: unknown = entity) =>
    render(<Component {...({ [key]: value, relations, mode } as any)} />, {
      wrapper: SidebarProvider,
    });
  it("disables saving an unchanged draft and creates a new entity", () => {
    const view = mount("update");
    expect(
      (screen.getByRole("button", { name: "btnSave" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    view.unmount();
    mount("create");
    fireEvent.click(screen.getByRole("button", { name: "btnCreate" }));
    expect(client.execute).toHaveBeenCalledWith({ [key]: entity });
  });
  it.each(tabs)("renders the %s tab and its controls", (tab) => {
    client.params = new URLSearchParams(`view=${tab}`);
    const view = mount("update");
    expect(view.container.textContent).toContain("btnSave");
    if (tab !== "default")
      expect(
        view.container.querySelectorAll(
          'input,textarea,select,[role="combobox"]',
        ).length,
      ).toBeGreaterThan(0);
  });
  it("edits a text field and saves a copy of the entity", () => {
    client.params = new URLSearchParams(
      key === "transcriber" ? "view=prompt" : "view=settings",
    );
    mount("update");
    const input =
      key === "transcriber"
        ? screen.getByDisplayValue("Transcriber prompt")
        : screen.getByDisplayValue("Repository");
    fireEvent.change(input, { target: { value: "Changed" } });
    fireEvent.click(screen.getByRole("button", { name: "btnSave" }));
    expect(
      client.execute.mock.lastCall![0][key][
        key === "transcriber" ? "prompt" : "name"
      ],
    ).toBe("Changed");
    expect(entity[key === "transcriber" ? "prompt" : "name"]).not.toBe(
      "Changed",
    );
  });
  it("renders an empty creation form without requiring optional config", () => {
    client.params = new URLSearchParams("view=settings");
    mount("create", {});
    expect(screen.getByRole("button", { name: "btnCreate" })).not.toBeNull();
  });
});

it("rejects editor hooks outside their providers", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  for (const hook of [useDocumentRepositoryEditor, useTranscriberEditor]) {
    function Outside() {
      hook();
      return null;
    }
    expect(() => render(<Outside />)).toThrow("outside provider");
  }
});

it("renders repository and transcriber information with populated and missing relations", () => {
  const view = render(
    <DocumentRepositoryInfo
      documentRepository={repository}
      workspace={workspace as any}
      modelMap={new Map([["embedding", model as any]])}
      transcriberMap={new Map([["transcriber", transcriber]])}
      editable
      editDocumentRepositoryPathname="/edit"
    />,
  );
  expect(view.container.textContent).toContain("Repository");
  expect(view.container.textContent).toContain("Embedding");
  view.rerender(<DocumentRepositoryInfo />);
  expect(view.container.querySelector("div")).not.toBeNull();
  view.rerender(
    <TranscriberInfo
      transcriber={transcriber}
      modelMap={new Map([["whisper", whisper as any]])}
      workspace={workspace as any}
      editable
      editTranscriberPathname="/edit"
    />,
  );
  expect(view.container.textContent).toContain("Transcriber");
  view.rerender(<TranscriberInfo />);
  expect(view.container.querySelector("div")).not.toBeNull();
});

async function chooseSelect(index: number, name: string) {
  const user = userEvent.setup();
  act(() => screen.getAllByRole("combobox")[index].focus());
  await user.keyboard("[ArrowDown]");
  const item = await screen.findByRole("option", { name: new RegExp(name) });
  act(() => item.focus());
  await user.keyboard("[Enter]");
}
function discard(input: HTMLElement) {
  fireEvent.click(
    input
      .closest('[data-slot="field"]')!
      .querySelector("button:has(svg.lucide-pencil-line)")!,
  );
}
describe.each(editors)(
  "%s settings changes",
  (_name, Component, key, entity) => {
    function mount() {
      client.params = new URLSearchParams("view=settings");
      return render(
        <Component
          {...({ [key]: entity, relations, mode: "update" } as any)}
        />,
        { wrapper: SidebarProvider },
      );
    }
    it("edits and independently discards the name and description", () => {
      mount();
      for (const value of [entity.name, entity.description]) {
        const input = screen.getByDisplayValue(value);
        fireEvent.change(input, { target: { value: "Changed text" } });
        fireEvent.click(screen.getByRole("button", { name: "btnSave" }));
        expect(
          client.execute.mock.lastCall![0][key][
            value === entity.name ? "name" : "description"
          ],
        ).toBe("Changed text");
        discard(input);
        expect(screen.getByDisplayValue(value)).toBeTruthy();
      }
    });
    it("selects and restores icons and theme colors", () => {
      const view = mount();
      const icons = Array.from(
        view.container.querySelectorAll<HTMLButtonElement>("button[title]"),
      );
      const icon = icons.find(
        (button) => button.title !== entity.icon.iconName,
      )!;
      fireEvent.click(icon);
      fireEvent.click(screen.getByRole("button", { name: "btnSave" }));
      expect(client.execute.mock.lastCall![0][key].icon.iconName).toBe(
        icon.title,
      );
      fireEvent.click(screen.getByText("labelIcon").querySelector("button")!);
      fireEvent.click(screen.getByRole("button", { name: "Blue" }));
      fireEvent.click(screen.getByRole("button", { name: "btnSave" }));
      expect(client.execute.mock.lastCall![0][key].color.oklchHue).toBe(250);
      fireEvent.click(screen.getByText("labelColor").querySelector("button")!);
      expect(
        (screen.getByRole("button", { name: "btnSave" }) as HTMLButtonElement)
          .disabled,
      ).toBe(true);
    });
    it("changes the owning workspace and restores its previous selection", async () => {
      mount();
      const index = screen.getAllByRole("combobox").length - 1;
      await chooseSelect(index, "Second workspace");
      fireEvent.click(screen.getByRole("button", { name: "btnSave" }));
      expect(client.execute.mock.lastCall![0][key].workspaceId).toBe("second");
      discard(screen.getAllByRole("combobox")[index]);
      expect(screen.getAllByRole("combobox")[index].textContent).toContain(
        "Workspace",
      );
    });
  },
);
it("keeps the embedding model and dimensions when restoring activation and model choices", async () => {
  client.params = new URLSearchParams("view=features");
  render(
    <DocumentRepositoryEditor
      mode="update"
      documentRepository={repository}
      relations={relations}
    />,
    { wrapper: SidebarProvider },
  );
  const keyword = screen.getByRole("switch", { name: /labelKeyword/ });
  const semantic = screen.getByRole("switch", { name: /labelSemantic/ });
  fireEvent.click(keyword);
  fireEvent.click(semantic);
  fireEvent.click(screen.getByRole("button", { name: "btnSave" }));
  expect(
    client.execute.mock.lastCall![0].documentRepository.index,
  ).toMatchObject({
    keyword: { active: false },
    embedding: { active: false, modelVectorSize: 768 },
  });
  discard(keyword);
  discard(semantic);
  expect(screen.getAllByRole("combobox")[0].textContent).toContain("Embedding");
  await chooseSelect(0, "Small embedding");
  fireEvent.click(screen.getByRole("button", { name: "btnSave" }));
  expect(
    client.execute.mock.lastCall![0].documentRepository.index.embedding,
  ).toMatchObject({ modelIdentifier: "other-embedding", modelVectorSize: 256 });
  discard(screen.getAllByRole("combobox")[0]);
  fireEvent.click(keyword);
  fireEvent.click(screen.getByRole("button", { name: "btnSave" }));
  expect(
    client.execute.mock.lastCall![0].documentRepository.index.embedding,
  ).toMatchObject({
    active: true,
    modelIdentifier: "embedding",
    modelVectorSize: 768,
  });
});
it("clears and restores the repository transcriber selection", async () => {
  client.params = new URLSearchParams("view=features");
  render(
    <DocumentRepositoryEditor
      mode="update"
      documentRepository={repository}
      relations={relations}
    />,
    { wrapper: SidebarProvider },
  );
  await chooseSelect(1, "labelNoTranscriber");
  fireEvent.click(screen.getByRole("button", { name: "btnSave" }));
  expect(
    client.execute.mock.lastCall![0].documentRepository.transcriberIdentifier,
  ).toBeUndefined();
  discard(screen.getAllByRole("combobox")[1]);
  expect(screen.getAllByRole("combobox")[1].textContent).toContain(
    "Transcriber",
  );
});
it("changes the speech model and restores the previous identifier", async () => {
  client.params = new URLSearchParams("view=settings");
  render(
    <TranscriberEditor
      mode="update"
      transcriber={transcriber}
      relations={relations}
    />,
    { wrapper: SidebarProvider },
  );
  await chooseSelect(0, "Other whisper");
  fireEvent.click(screen.getByRole("button", { name: "btnSave" }));
  expect(client.execute.mock.lastCall![0].transcriber.modelIdentifier).toBe(
    "other-whisper",
  );
  discard(screen.getAllByRole("combobox")[0]);
  expect(screen.getAllByRole("combobox")[0].textContent).toContain("Whisper");
});

describe.each(editors)(
  "%s editor menu and validation",
  (_name, Component, key, entity) => {
    const kind = key === "transcriber" ? "Transcriber" : "DocumentRepository";
    async function menu(view: ReturnType<typeof render>, label: string) {
      fireEvent.click(
        view.container.querySelector("button:has(svg.lucide-ellipsis)")!,
      );
      fireEvent.click(await screen.findByRole("menuitem", { name: label }));
    }
    it("saves and clones edited drafts through the menu and deletes after confirmation", async () => {
      client.params = new URLSearchParams("view=settings");
      const view = render(
        <Component
          {...({ [key]: entity, mode: "update", relations } as any)}
        />,
        { wrapper: SidebarProvider },
      );
      fireEvent.change(screen.getByDisplayValue(entity.name), {
        target: { value: "Changed" },
      });
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      await menu(view, `labelSave${kind}`);
      expect(client.execute.mock.lastCall![0][key].name).toBe("Changed");
      await menu(view, `labelClone${kind}`);
      expect(client.execute.mock.lastCall![0][key].name).toBe("Changed");
      if (key === "transcriber")
        expect(client.execute.mock.lastCall![0][key].id).not.toBe(entity.id);
      await menu(view, `labelDelete${kind}`);
      const dialog = await screen.findByRole("alertdialog");
      fireEvent.click(
        dialog.querySelector('button[data-slot="alert-dialog-action"]')!,
      );
      expect(client.execute.mock.lastCall![0][`${key}Id`]).toBe(entity.id);
    });
    it("submits empty creation drafts and exposes nested validation errors", async () => {
      client.params = new URLSearchParams("view=settings");
      client.validationErrors = {
        [key]: {
          name: ["required"],
          workspaceId: ["required"],
          modelIdentifier: ["required"],
        },
      };
      const view = render(
        <Component
          {...({ [key]: undefined, mode: "create", relations } as any)}
        />,
        { wrapper: SidebarProvider },
      );
      expect(screen.getByText("labelSelectWorkspace")).toBeTruthy();
      await menu(view, `labelCreate${kind}`);
      expect(client.execute.mock.lastCall![0][key]).toEqual({});
    });
  },
);
it("renders and changes default repository features without optional index configuration", () => {
  client.params = new URLSearchParams("view=features");
  render(
    <DocumentRepositoryEditor
      mode="create"
      documentRepository={{}}
      relations={relations}
    />,
    { wrapper: SidebarProvider },
  );
  for (const toggle of screen.getAllByRole("switch")) {
    fireEvent.click(toggle);
    discard(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("false");
  }
});

it("saves all three retry levels, defaults legacy transcribers to thorough and restores the saved setting", async () => {
  client.params = new URLSearchParams("view=settings");
  render(
    <TranscriberEditor
      mode="update"
      transcriber={transcriber}
      relations={relations}
    />,
    { wrapper: SidebarProvider },
  );
  // jsdom has no layout; Base UI needs a nonzero track width to position its thumb.
  const slider = await screen.findByRole("slider", { hidden: true });
  expect((slider as HTMLInputElement).value).toBe("2");
  for (const [key, level] of [
    ["Home", "fast"],
    ["ArrowRight", "balanced"],
    ["End", "thorough"],
  ]) {
    fireEvent.keyDown(slider, { key });
    fireEvent.click(screen.getByRole("button", { name: "btnSave" }));
    expect(client.execute.mock.lastCall![0].transcriber.retryLevel).toBe(level);
  }
  fireEvent.keyDown(slider, { key: "Home" });
  discard(slider);
  expect((slider as HTMLInputElement).value).toBe("2");
});
