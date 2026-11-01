// @vitest-environment jsdom
import "./client-setup";
import { client } from "./client-setup";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AgentEditor,
  useAgentEditor,
} from "../../apps/web/app/(main)/agent/_components/AgentEditor";
import { SidebarProvider } from "../../packages/ui/src/components/sidebar";
import { AgentInfo } from "../../apps/web/app/(main)/agent/_components/AgentInfo";
import { agentSchema } from "../../packages/database/src/agent/_schemas";

vi.mock("../../apps/web/app/(main)/agent/_actions/createAgent", () => ({
  createAgent: vi.fn(),
}));
vi.mock("../../apps/web/app/(main)/agent/_actions/updateAgent", () => ({
  updateAgent: vi.fn(),
}));
vi.mock("../../apps/web/app/(main)/agent/_actions/deleteAgent", () => ({
  deleteAgent: vi.fn(),
}));
vi.mock("../../apps/web/app/(main)/_actions/updateFavorite", () => ({
  updateFavorite: vi.fn(),
}));
vi.mock("@/lib/groupSortView/action", () => ({ savePreferences: vi.fn() }));

vi.mock("@/lib/mcp/clientSettings", () => ({
  requestConnections: () => new Promise(() => {}),
}));

const color = { type: "color-oklch-hue", oklchHue: 100 };
const agent = {
  id: "agent",
  name: "Agent",
  description: "Description",
  documentation: "Docs",
  modelIdentifier: "model",
  modelThinking: "optional-on",
  workspaceId: "workspace",
  version: "agent-config-version-4",
  color,
  icon: { type: "icon-lucide", iconName: "bot" },
  recommendedMessages: [
    { id: "recommended", message: "Hello", label: "Welcome" },
  ],
  additionalFunctions: {
    batch: true,
    disappearingChats: true,
    fileUpload: true,
    nightshift: true,
    pursueGoal: true,
  },
  roles: [
    {
      id: "role",
      name: "Writer",
      prompt: "Write things",
      roleSelectionHint: "Writing",
      documentRepositoryMounts: [],
      mcps: [],
      tools: { calculator: true },
    },
  ],
} as any;
const model = {
  id: "model",
  identifier: "model",
  name: "Model",
  type: "ollama_llm_v1",
  config: { contextSize: 8192, featureVision: true },
  description: "Model description",
} as any;
const workspace = {
  id: "workspace",
  name: "Workspace",
  userRole: "editor",
  description: "Workspace description",
} as any;
const relations = {
  connections: [],
  documentRepositories: [],
  models: [model],
  theme: {
    version: "theme-v2",
    colors: [{ id: "color", name: "Green", color }],
  },
  workspaces: [workspace],
} as any;
afterEach(cleanup);
beforeEach(() => {
  client.params = new URLSearchParams();
  client.execute.mockClear();
  client.validationErrors = undefined;
  client.pending = false;
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

function editor(mode = "update", value = agent, customRelations = relations) {
  return render(
    <AgentEditor
      mode={mode as any}
      agent={value}
      relations={customRelations}
    />,
    { wrapper: SidebarProvider },
  );
}

describe("agent editing flows", () => {
  it("disables saving unchanged agents and renders overview details", () => {
    editor();
    expect(
      (screen.getByRole("button", { name: "btnSave" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getAllByText("Agent").length).toBeGreaterThan(0);
  });
  it("creates an agent and sends the complete draft to the action", () => {
    editor("create");
    fireEvent.click(screen.getByRole("button", { name: "btnCreate" }));
    expect(client.execute).toHaveBeenCalledWith({ agent });
  });
  it.each(["roles", "docs", "settings"])(
    "renders the %s editor tab",
    (view) => {
      client.params = new URLSearchParams(`view=${view}`);
      const result = editor();
      expect(result.container.textContent).toContain(
        view === "roles"
          ? "tabPrompt"
          : view === "docs"
            ? "Docs"
            : "labelThinking",
      );
      expect(
        result.container.querySelectorAll("input,textarea,button").length,
      ).toBeGreaterThan(1);
    },
  );
  it("edits the role prompt and enables save without mutating the default object", () => {
    client.params = new URLSearchParams("view=roles&role-role=prompt");
    editor();
    const input = screen.getByDisplayValue("Write things");
    fireEvent.change(input, { target: { value: "Changed prompt" } });
    fireEvent.click(screen.getByRole("button", { name: "btnSave" }));
    expect(client.execute.mock.lastCall![0].agent.roles[0].prompt).toBe(
      "Changed prompt",
    );
    expect(agent.roles[0].prompt).toBe("Write things");
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
  it("rejects use of the editor hook outside its provider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    function Outside() {
      useAgentEditor();
      return null;
    }
    expect(() => render(<Outside />)).toThrow("outside provider");
    consoleError.mockRestore();
  });
  it("renders populated and empty info with optional models and workspaces", () => {
    const view = render(
      <AgentInfo
        agent={agent}
        documentRepositoryMap={new Map()}
        modelMap={new Map([["model", model]])}
        workspace={workspace}
        editable
        editAgentPathname="/edit"
        editDefaultAgent={{ ...agent, documentation: "Old" }}
      />,
    );
    expect(view.container.textContent).toContain("labelPrompt");
    expect(view.container.textContent).toContain("Model");
    const expanders = view.container.querySelectorAll(
      '[data-slot="collapsible-trigger"]',
    );
    const prompt = Array.from(expanders).find(
      (button) => button.textContent === "labelPrompt",
    );
    if (prompt) fireEvent.click(prompt);
    expect(view.container.textContent).toContain("Write things");
    view.rerender(<AgentInfo documentRepositoryMap={new Map()} />);
    expect(view.container.querySelector("main,div")).not.toBeNull();
  });
});

function saveRole() {
  fireEvent.click(screen.getByRole("button", { name: "btnSave" }));
  return client.execute.mock.lastCall![0].agent.roles[0];
}
function richEditor(view: string) {
  client.params = new URLSearchParams(`view=roles&role-role=${view}`);
  return editor("update", {
    ...agent,
    roles: [
      {
        ...agent.roles[0],
        mcps: [
          {
            id: "mcp",
            name: "Connector",
            type: "http",
            url: "https://example.test",
            headers: { Authorization: "secret" },
          },
        ],
        documentRepositoryMounts: [
          {
            id: "mount",
            documentRepositoryIdentifier: "repo",
            mount: "/docs",
            pathRepository: "/base",
            permission: "read-only",
          },
        ],
      },
    ],
  });
}
describe("role connections and settings", () => {
  it("edits MCP endpoints and renames headers without losing their values", () => {
    richEditor("mcps");
    fireEvent.change(screen.getByDisplayValue("Connector"), {
      target: { value: "Updated connector" },
    });
    fireEvent.change(screen.getByDisplayValue("https://example.test"), {
      target: { value: "https://new.test/mcp" },
    });
    const key = screen.getByDisplayValue("Authorization");
    fireEvent.focus(key);
    fireEvent.change(key, { target: { value: "X-Token" } });
    fireEvent.blur(key);
    expect(saveRole().mcps[0]).toMatchObject({
      name: "Updated connector",
      url: "https://new.test/mcp",
      headers: { "X-Token": "secret" },
    });
    fireEvent.change(screen.getByDisplayValue("secret"), {
      target: { value: "replacement" },
    });
    expect(saveRole().mcps[0].headers).toEqual({ "X-Token": "replacement" });
  });
  it("adds a header once, removes headers and appends another MCP connection", () => {
    richEditor("mcps");
    fireEvent.click(screen.getByRole("button", { name: "labelAddHeader" }));
    expect(
      (
        screen.getByRole("button", {
          name: "labelAddHeader",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    const key = screen.getByDisplayValue("Authorization");
    fireEvent.click(key.closest(".flex.items-end")!.querySelector("button")!);
    expect(saveRole().mcps[0].headers).toEqual({ "": "" });
    fireEvent.click(screen.getByRole("button", { name: "labelAddMCP" }));
    expect(saveRole().mcps).toHaveLength(2);
    expect(saveRole().mcps[1]).toMatchObject({
      type: "http",
      url: "",
      headers: {},
    });
  });
  it("discards endpoint edits and reports nested URL validation errors", () => {
    client.validationErrors = {
      agent: {
        roles: { 0: { mcps: { 0: { url: { _errors: ["invalid"] } } } } },
      },
    };
    richEditor("mcps");
    const input = screen.getByDisplayValue("https://example.test");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("errorInvalidUrl")).toBeTruthy();
    fireEvent.change(input, { target: { value: "invalid" } });
    fireEvent.click(
      input
        .closest('[data-slot="field"]')!
        .querySelector("button:has(svg.lucide-pencil-line)")!,
    );
    expect(screen.getByDisplayValue("https://example.test")).toBeTruthy();
  });
  it("changes mount paths and adds a repository connection with safe defaults", () => {
    richEditor("documentRepositoryMounts");
    fireEvent.change(screen.getByDisplayValue("/docs"), {
      target: { value: "/files" },
    });
    fireEvent.change(screen.getByDisplayValue("/base"), {
      target: { value: "/reports" },
    });
    expect(saveRole().documentRepositoryMounts[0]).toMatchObject({
      mount: "/files",
      pathRepository: "/reports",
    });
    fireEvent.click(screen.getByRole("button", { name: "labelAddConnection" }));
    expect(saveRole().documentRepositoryMounts[1]).toMatchObject({
      mount: "/",
      pathRepository: "/",
      permission: "read-only",
      documentRepositoryIdentifier: "",
    });
  });
  it.each(["labelConnectRepository", "labelConnectMCP"])(
    "connects tools through %s and opens their configuration",
    (label) => {
      client.push.mockClear();
      client.params = new URLSearchParams("view=roles&role-role=tools");
      editor();
      fireEvent.click(screen.getByRole("button", { name: label }));
      expect(client.push).toHaveBeenCalledWith(
        expect.stringContaining(
          label.endsWith("MCP")
            ? "role-role=mcps"
            : "role-role=documentRepositoryMounts",
        ),
      );
      expect(
        saveRole()[label.endsWith("MCP") ? "mcps" : "documentRepositoryMounts"],
      ).toHaveLength(1);
    },
  );
  it("updates role descriptions and adds a separate role", () => {
    richEditor("settings");
    fireEvent.change(screen.getByDisplayValue("Writer"), {
      target: { value: "Reviewer" },
    });
    fireEvent.change(screen.getByDisplayValue("Writing"), {
      target: { value: "Review requests" },
    });
    expect(saveRole()).toMatchObject({
      name: "Reviewer",
      roleSelectionHint: "Review requests",
    });
    fireEvent.click(screen.getByRole("button", { name: "labelAddRole" }));
    saveRole();
    expect(client.execute.mock.lastCall![0].agent.roles).toHaveLength(2);
  });
});

async function selectOption(index: number | HTMLElement, option: string) {
  const user = userEvent.setup();
  act(() =>
    (typeof index === "number"
      ? screen.getAllByRole("combobox")[index]!
      : index
    ).focus(),
  );
  await user.keyboard("[ArrowDown]");
  const item = await screen.findByRole("option", { name: option });
  act(() => item.focus());
  await user.keyboard("[Enter]");
}
it("selects, clears and restores an agent transcriber and preserves it in the validated config", async () => {
  client.params = new URLSearchParams("view=settings");
  editor(
    "update",
    { ...agent, transcriberIdentifier: "transcriber" },
    {
      ...relations,
      transcribers: [
        { id: "transcriber-id", identifier: "transcriber", name: "Speech" },
      ],
    },
  );
  const select = screen.getByRole("combobox", { name: "labelTranscriber" });
  expect(select.textContent).toContain("Speech");
  await selectOption(select, "labelNoTranscriber");
  fireEvent.click(screen.getByRole("button", { name: "btnSave" }));
  expect(
    client.execute.mock.lastCall![0].agent.transcriberIdentifier,
  ).toBeUndefined();
  discardField(select);
  expect(select.textContent).toContain("Speech");
  await selectOption(select, "labelNoTranscriber");
  await selectOption(select, "Speech");
  const selected = agentSchema.parse({
    ...agent,
    transcriberIdentifier: "transcriber",
  });
  expect(selected.transcriberIdentifier).toBe("transcriber");
  expect(agentSchema.parse(agent).transcriberIdentifier).toBeUndefined();
});
function discardField(input: HTMLElement) {
  fireEvent.click(
    input
      .closest('[data-slot="field"]')!
      .querySelector("button:has(svg.lucide-pencil-line)")!,
  );
}
describe("complete role configuration interactions", () => {
  it("changes repository and permission selections and restores every mount field", async () => {
    client.params = new URLSearchParams(
      "view=roles&role-role=documentRepositoryMounts",
    );
    editor(
      "update",
      {
        ...agent,
        roles: [
          {
            ...agent.roles[0],
            documentRepositoryMounts: [
              {
                id: "mount",
                documentRepositoryIdentifier: "repo",
                mount: "/docs",
                pathRepository: "/base",
                permission: "read-only",
              },
              {
                id: "other",
                documentRepositoryIdentifier: "repo",
                mount: "/other",
                pathRepository: "/",
                permission: "read-only",
              },
            ],
          },
        ],
      },
      {
        ...relations,
        documentRepositories: [
          {
            id: "repo",
            identifier: "repo",
            name: "Original repository",
            workspaceId: "workspace",
          },
          { id: "second", identifier: "second", name: "Second repository" },
        ],
      },
    );
    await selectOption(0, "Second repository");
    await selectOption(1, "labelWrite");
    expect(saveRole().documentRepositoryMounts[0]).toMatchObject({
      documentRepositoryIdentifier: "second",
      permission: "write",
    });
    for (const [value, replacement] of [
      ["/docs", "/changed"],
      ["/base", "/new"],
    ]) {
      const input = screen.getByDisplayValue(value);
      fireEvent.change(input, { target: { value: replacement } });
      discardField(input);
      expect(screen.getByDisplayValue(value)).toBeTruthy();
    }
    for (const index of [0, 1]) {
      const input = screen.getAllByRole("combobox")[index];
      fireEvent.click(
        input
          .closest('[data-slot="field"]')!
          .querySelector("button:has(svg.lucide-pencil-line)")!,
      );
    }
    expect(screen.getAllByRole("combobox")[0].textContent).toContain(
      "Original repository",
    );
    expect(screen.getAllByRole("combobox")[1].textContent).toContain(
      "labelReadOnly",
    );
  });
  it("deletes MCP connections after confirmation and returns to the role overview", async () => {
    richEditor("mcps");
    fireEvent.click(
      screen.getByRole("button", { name: "labelDeleteConnection" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "labelDeleteMCP" }),
    );
    expect(saveRole().mcps).toEqual([]);
    expect(client.push).toHaveBeenCalledWith("?view=roles");
  });
  it("discards MCP names and HTTP headers independently", () => {
    richEditor("mcps");
    const name = screen.getByDisplayValue("Connector");
    fireEvent.change(name, { target: { value: "Changed" } });
    discardField(name);
    expect(screen.getByDisplayValue("Connector")).toBeTruthy();
    fireEvent.change(screen.getByDisplayValue("secret"), {
      target: { value: "Changed" },
    });
    fireEvent.click(
      screen.getByText("labelHTTPHeaders").querySelector("button")!,
    );
    expect(screen.getByDisplayValue("secret")).toBeTruthy();
  });
  it("deletes repository mounts only after confirmation", async () => {
    richEditor("documentRepositoryMounts");
    fireEvent.click(
      screen.getByRole("button", { name: "labelDeleteConnection" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "labelDeleteConnection" }),
    );
    expect(saveRole().documentRepositoryMounts).toEqual([]);
  });
  it("overrides and restores role models, thinking and descriptions", async () => {
    richEditor("settings");
    await selectOption(0, "Model");
    await selectOption(1, "labelThinking_mandatoryOn");
    expect(saveRole()).toMatchObject({
      modelIdentifierOverride: "model",
      modelThinkingOverride: "mandatory-on",
    });
    await selectOption(0, "labelDoNotOverride");
    await selectOption(1, "labelDoNotOverride");
    expect(
      screen
        .getAllByRole("combobox")
        .every((input) => input.textContent?.includes("labelDoNotOverride")),
    ).toBe(true);
    for (const [value, replacement] of [
      ["Writer", "Changed name"],
      ["Writing", "Changed hint"],
    ]) {
      const input = screen.getByDisplayValue(value);
      fireEvent.change(input, { target: { value: replacement } });
      discardField(input);
      expect(screen.getByDisplayValue(value)).toBeTruthy();
    }
    await selectOption(0, "Model");
    await selectOption(1, "labelThinking_optionalOff");
    for (const input of screen.getAllByRole("combobox"))
      fireEvent.click(
        input
          .closest('[data-slot="field"]')!
          .querySelector("button:has(svg.lucide-pencil-line)")!,
      );
    expect(
      screen
        .getAllByRole("combobox")
        .every((input) => input.textContent?.includes("labelDoNotOverride")),
    ).toBe(true);
  });
  it("removes a role and displays the empty-role state", async () => {
    richEditor("settings");
    fireEvent.click(screen.getByRole("button", { name: "labelDeleteRole" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "labelDeleteRole" }),
    );
    expect(screen.getByText("labelNoRoles")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "btnSave" }));
    expect(client.execute.mock.lastCall![0].agent.roles).toEqual([]);
  });
  it("edits recommended messages and documentation then resets each section", () => {
    client.params = new URLSearchParams("view=docs");
    const view = editor();
    fireEvent.click(screen.getByRole("button", { name: "labelAddMessage" }));
    fireEvent.change(screen.getByLabelText("labelLabel"), {
      target: { value: "New label" },
    });
    fireEvent.change(screen.getByLabelText("labelMessage"), {
      target: { value: "New message" },
    });
    fireEvent.click(screen.getByRole("button", { name: "btnSave" }));
    expect(
      client.execute.mock.lastCall![0].agent.recommendedMessages.at(-1),
    ).toMatchObject({ label: "New label", message: "New message" });
    fireEvent.click(screen.getByRole("button", { name: "labelClose" }));
    const docs = screen.getByDisplayValue("Docs");
    fireEvent.change(docs, { target: { value: "New docs" } });
    fireEvent.click(
      screen.getByText("labelDocumentation").querySelector("button")!,
    );
    expect(screen.getByDisplayValue("Docs")).toBeTruthy();
    const deleteButtons = view.container.querySelectorAll(
      "button:has(svg.lucide-x)",
    );
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(
      screen.getByText("labelRecommendedMessages").querySelector("button")!,
    );
    expect(view.container.textContent).toContain("Welcome");
    expect(view.container.textContent).not.toContain("New label");
  });
  it.each([{ roles: [] }, { roles: agent.roles }])(
    "opens creation checklist configuration for roles %j",
    ({ roles }) => {
      editor("create", { ...agent, roles });
      for (const label of [
        "labelDefinePrompt",
        "labelConnectTools",
        "labelWriteDocs",
      ])
        fireEvent.click(screen.getByText(label));
      expect(client.push).toHaveBeenCalledWith("?view=docs");
      expect(client.push).toHaveBeenCalledWith(
        roles.length ? "?view=roles&role-role=prompt#role-role" : "?view=roles",
      );
    },
  );
});

describe("agent settings persistence and resets", () => {
  function settings(value = agent) {
    client.params = new URLSearchParams("view=settings");
    return editor("update", value, {
      ...relations,
      models: [
        model,
        {
          ...model,
          id: "second-model",
          identifier: "second-model",
          name: "Other model",
        },
      ],
      workspaces: [
        { ...workspace, claim: "workspace-admin" },
        {
          ...workspace,
          id: "other-workspace",
          name: "Other workspace",
          claim: "admin",
        },
      ],
      theme: {
        colors: [
          { name: "Green", color },
          { name: "Blue", color: { ...color, oklchHue: 250 } },
        ],
      },
    });
  }
  it("edits and restores the agent name and description", () => {
    settings();
    for (const value of ["Agent", "Description"]) {
      const input = screen.getByDisplayValue(value);
      fireEvent.change(input, { target: { value: "Changed" } });
      fireEvent.click(screen.getByRole("button", { name: "btnSave" }));
      expect(
        client.execute.mock.lastCall![0].agent[
          value === "Agent" ? "name" : "description"
        ],
      ).toBe("Changed");
      discardField(input);
      expect(screen.getByDisplayValue(value)).toBeTruthy();
    }
  });
  it.each([true, false])(
    "toggles and restores optional functions with existing configuration=%s",
    (configured) => {
      settings(
        configured ? agent : { ...agent, additionalFunctions: undefined },
      );
      for (const name of ["labelFileUpload", "labelBatch"]) {
        const toggle = screen.getByRole("switch", { name: new RegExp(name) });
        fireEvent.click(toggle);
        expect(toggle.getAttribute("aria-checked")).toBe("false");
        discardField(toggle);
        expect(toggle.getAttribute("aria-checked")).toBe("true");
      }
    },
  );
  it("stores and restores a changed model, thinking preference and workspace", async () => {
    settings();
    for (const [index, name, property, value] of [
      [1, "Other model", "modelIdentifier", "second-model"],
      [2, "labelThinking_mandatoryOff", "modelThinking", "mandatory-off"],
      [3, "Other workspace", "workspaceId", "other-workspace"],
    ] as const) {
      await selectOption(index, name);
      fireEvent.click(screen.getByRole("button", { name: "btnSave" }));
      expect(client.execute.mock.lastCall![0].agent[property]).toBe(value);
      discardField(screen.getAllByRole("combobox")[index]);
    }
    expect(
      (screen.getByRole("button", { name: "btnSave" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
  it("changes and resets appearance using default and additional icons", async () => {
    const view = settings();
    const icon = Array.from(
      view.container.querySelectorAll<HTMLButtonElement>("button[title]"),
    ).find((button) => button.title !== "bot")!;
    fireEvent.click(icon);
    fireEvent.click(screen.getByRole("button", { name: "btnSave" }));
    expect(client.execute.mock.lastCall![0].agent.icon.iconName).toBe(
      icon.title,
    );
    fireEvent.click(screen.getByText("labelIcon").querySelector("button")!);
    fireEvent.click(screen.getByRole("button", { name: "Blue" }));
    fireEvent.click(screen.getByRole("button", { name: "btnSave" }));
    expect(client.execute.mock.lastCall![0].agent.color.oklchHue).toBe(250);
    fireEvent.click(screen.getByText("labelColor").querySelector("button")!);
    fireEvent.click(screen.getByRole("button", { name: "buttonMoreIcons" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(
      dialog.querySelector("[data-icon=file]")!.closest("button")!,
    );
    fireEvent.click(screen.getByRole("button", { name: "btnSave" }));
    expect(client.execute.mock.lastCall![0].agent.icon.iconName).toBe("file");
  });
  it("resets all edits only after explicit discard confirmation", async () => {
    const view = settings();
    fireEvent.change(screen.getByDisplayValue("Agent"), {
      target: { value: "Changed" },
    });
    const globalDiscard =
      view.container.querySelector(
        "header button:has(svg.lucide-pencil-line), [data-slot=header-main] button:has(svg.lucide-pencil-line)",
      ) ?? view.container.querySelector("button:has(svg.lucide-pencil-line)");
    fireEvent.click(globalDiscard!);
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "labelDiscard" }),
    );
    expect(screen.getByDisplayValue("Agent")).toBeTruthy();
  });
  it("renders missing optional settings and validation messages", () => {
    client.validationErrors = {
      agent: {
        name: ["required"],
        modelIdentifier: ["required"],
        workspaceId: ["required"],
      },
    };
    settings({ id: "empty" } as any);
    expect(screen.getByText("labelSelectModel")).toBeTruthy();
    expect(screen.getByText("labelSelectWorkspace")).toBeTruthy();
  });
});

it("restores newly added MCP connection fields to their empty defaults", () => {
  richEditor("mcps");
  fireEvent.click(screen.getByRole("button", { name: "labelAddMCP" }));
  const name = screen.getAllByLabelText("labelName").at(-1)!;
  const url = screen.getAllByLabelText("labelUrl").at(-1)!;
  fireEvent.change(name, { target: { value: "New name" } });
  discardField(name);
  expect((name as HTMLInputElement).value).toBe("");
  fireEvent.change(url, { target: { value: "https://new.test" } });
  discardField(url);
  expect((url as HTMLInputElement).value).toBe("");
});
it("marks nested MCP validation errors and restores URL edits", () => {
  client.validationErrors = {
    agent: { roles: { 0: { mcps: { 0: { url: ["invalid"] } } } } },
  };
  richEditor("mcps");
  expect(screen.getByText("errorInvalidUrl")).toBeTruthy();
  const url = screen.getByDisplayValue("https://example.test");
  fireEvent.change(url, { target: { value: "broken" } });
  discardField(url);
  expect(screen.getByDisplayValue("https://example.test")).toBeTruthy();
});

it("resets newly added repository mount fields to safe defaults", async () => {
  const view = richEditor("documentRepositoryMounts");
  fireEvent.click(screen.getByRole("button", { name: "labelAddConnection" }));
  const pathInputs = screen.getAllByDisplayValue("/");
  const mount = pathInputs.at(-2)!;
  const repositoryPath = pathInputs.at(-1)!;
  for (const input of [mount, repositoryPath]) {
    fireEvent.change(input, { target: { value: "/changed" } });
    discardField(input);
    expect((input as HTMLInputElement).value).toBe("/");
  }
  const permission = screen.getAllByRole("combobox").at(-1)!;
  const user = userEvent.setup();
  act(() => permission.focus());
  await user.keyboard("[ArrowDown]");
  const write = await screen.findByRole("option", { name: "labelWrite" });
  act(() => write.focus());
  await user.keyboard("[Enter]");
  discardField(permission);
  expect(permission.textContent).toContain("labelReadOnly");
  expect(screen.getAllByDisplayValue("/")).toHaveLength(2);
});

describe("web configuration in the agent editor", () => {
  it("saves fetch and search settings through the real editor context", () => {
    client.params = new URLSearchParams("view=roles&role-role=tool-web");
    editor("update", {
      ...agent,
      roles: [
        {
          ...agent.roles[0],
          toolWebAccess: {
            active: true,
            webFetch: "off",
            webSearch: "off",
            webSearchProvider: "brave",
            webFetchAccess: "allow-list",
            webFetchAllowList: ["example.com"],
          },
        },
      ],
    });
    fireEvent.click(screen.getByRole("switch", { name: "labelFetch" }));
    fireEvent.click(screen.getByRole("switch", { name: "labelAskFetch" }));
    fireEvent.click(screen.getByRole("switch", { name: "labelSearch" }));
    expect(saveRole().toolWebAccess).toEqual({
      active: true,
      webFetch: "ask",
      webSearch: "on",
      webSearchProvider: "brave",
      webFetchAccess: "allow-list",
      webFetchAllowList: ["example.com"],
    });
    expect(agent.roles[0].toolWebAccess).toBeUndefined();
  });
});

describe("agent editor resource labels and available tools", () => {
  it.each([false, true])(
    "hides unavailable tool tabs for legacy active=%s configuration",
    (active) => {
      client.params = new URLSearchParams(
        "view=roles&role-role=tool-calculator",
      );
      editor("update", {
        ...agent,
        roles: [
          {
            ...agent.roles[0],
            toolCalculator: { active },
            toolChatAwareness: { active },
          },
        ],
      });
      expect(screen.queryByRole("tab", { name: /tabCalc/ })).toBeNull();
      expect(screen.queryByRole("tab", { name: /tabChat/ })).toBeNull();
      expect(
        screen
          .getByRole("tab", { name: "tabOverview" })
          .getAttribute("aria-selected"),
      ).toBe("true");
    },
  );

  it.each(["default", "roles"])(
    "resolves repository identifiers and external models in %s",
    (view) => {
      client.params = new URLSearchParams(`view=${view}`);
      const external = {
        ...model,
        id: "model-row-id",
        identifier: "external-chat",
        name: "External chat model",
        type: "external_llm_v1",
        config: {
          provider: "openai",
          modelId: "test-model",
          baseUrl: "",
          headers: {},
        },
      };
      const repository = {
        id: "repository-row-id",
        identifier: "knowledge",
        name: "Known knowledge base",
      };
      editor(
        "update",
        {
          ...agent,
          modelIdentifier: external.identifier,
          roles: [
            {
              ...agent.roles[0],
              modelIdentifierOverride: external.identifier,
              documentRepositoryMounts: [
                {
                  id: "mount",
                  documentRepositoryIdentifier: repository.identifier,
                  mount: "/docs",
                  pathRepository: "/",
                  permission: "read-only",
                },
              ],
            },
          ],
        },
        {
          ...relations,
          models: [external],
          documentRepositories: [repository],
        },
      );
      expect(screen.getAllByText(external.name).length).toBeGreaterThan(0);
      expect(screen.getAllByText(repository.name).length).toBeGreaterThan(0);
      expect(screen.queryByText("labelUnknownRepository")).toBeNull();
      expect(screen.queryByText("labelUnknownModel")).toBeNull();
    },
  );
});
