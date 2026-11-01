// @vitest-environment jsdom
import "./client-setup";
import { client } from "./client-setup";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { ModelMetadataForm } from "../../apps/web/app/(settings)/models/_components/ModelMetadataForm";
import { ExternalModelForm } from "../../apps/web/app/(settings)/models/_components/ExternalModelForm";
import { SidebarProvider } from "@schornio/aibox-package-ui/components/sidebar";
import { ModelsOverview } from "../../apps/web/app/(settings)/models/_components/ModelsOverview";
vi.mock(
  "../../apps/web/app/(settings)/models/_actions/addExternalModel",
  () => ({ addExternalModel: vi.fn() }),
);
vi.mock(
  "../../apps/web/app/(settings)/models/_actions/updateExternalModel",
  () => ({ updateExternalModel: vi.fn() }),
);
vi.mock("../../apps/web/app/(settings)/models/_actions/discoverModels", () => ({
  discoverModels: vi.fn().mockResolvedValue({ data: { models: [] } }),
}));
vi.mock(
  "../../apps/web/app/(settings)/models/_actions/updateModelMetadata",
  () => ({ updateModelMetadata: vi.fn() }),
);
vi.mock("../../apps/web/app/(settings)/models/_actions/deleteModel", () => ({
  deleteModel: vi.fn(),
}));
vi.mock("@/lib/groupSortView/action", () => ({ savePreferences: vi.fn() }));
vi.mock("@schornio/aibox-package-ui/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));
afterEach(cleanup);
beforeEach(() => {
  client.execute.mockReset();
  client.refresh.mockReset();
  client.pending = false;
  client.params = new URLSearchParams();
});

it("shows the cloud promotion and links to provider selection", () => {
  render(
    <SidebarProvider>
      <ModelsOverview models={[]} />
    </SidebarProvider>,
  );
  expect(screen.getAllByText("schorn.ai Cloud")).toHaveLength(1);
  expect(screen.getByText("labelComingSoon")).toBeTruthy();
  expect(screen.getAllByRole("button", { name: "labelAdd" })).toHaveLength(1);
});
it("preserves input on failure and navigates only after confirmed creation", async () => {
  client.execute
    .mockResolvedValueOnce({ serverError: "failed" })
    .mockResolvedValueOnce({ data: { id: "external-test" } });
  render(<ExternalModelForm provider="openai-compatible" />);
  fireEvent.change(screen.getByLabelText("fields.name"), {
    target: { value: "Team" },
  });
  fireEvent.change(screen.getByLabelText("fields.modelId"), {
    target: { value: "chat" },
  });
  fireEvent.change(screen.getByLabelText("fields.baseUrl"), {
    target: { value: "https://api.example.com/v1" },
  });
  fireEvent.submit(screen.getByLabelText("fields.name").closest("form")!);
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain("errorAdd"),
  );
  expect(screen.getByDisplayValue("Team")).toBeTruthy();
  expect(client.refresh).not.toHaveBeenCalled();
  fireEvent.submit(screen.getByLabelText("fields.name").closest("form")!);
  await waitFor(() => expect(client.refresh).toHaveBeenCalledOnce());
  expect(client.execute.mock.lastCall![0]).toEqual({
    provider: "openai-compatible",
    name: "Team",
    modelId: "chat",
    baseUrl: "https://api.example.com/v1",
    apiKey: "",
  });
});

const mixedModels = [
  {
    id: "local",
    name: "Local chat",
    identifier: "qwen",
    type: "ollama_llm_v1",
    description: null,
  },
  {
    id: "external",
    name: "External chat",
    identifier: "external:uuid",
    type: "external_llm_v1",
    modelId: "chat",
    description: null,
  },
] as any;
it.each(["cards", "table"])(
  "shows local and external models together in %s view",
  (view) => {
    client.params = new URLSearchParams({ view });
    render(
      <SidebarProvider>
        <ModelsOverview models={mixedModels} />
      </SidebarProvider>,
    );
    expect(screen.getByText("Local chat")).toBeTruthy();
    expect(screen.getByText("External chat")).toBeTruthy();
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.queryByRole("table") !== null).toBe(view === "table");
  },
);
it("groups both language models by type, independently of origin", () => {
  client.params = new URLSearchParams({ group: "type" });
  render(
    <SidebarProvider>
      <ModelsOverview models={mixedModels} />
    </SidebarProvider>,
  );
  expect(
    screen.getByRole("heading", { name: "types.ollama_llm_v1" }),
  ).toBeTruthy();
  expect(
    screen.queryByRole("heading", { name: "types.external_llm_v1" }),
  ).toBeNull();
});
it("groups a table by internal and external models", () => {
  client.params = new URLSearchParams({ group: "origin", view: "table" });
  render(
    <SidebarProvider>
      <ModelsOverview models={mixedModels} />
    </SidebarProvider>,
  );
  expect(screen.getAllByText("labelInternalOrigin")).toHaveLength(2);
  expect(screen.getAllByText("labelExternalOrigin")).toHaveLength(2);
});
it("filters models in the shared overview", async () => {
  render(
    <SidebarProvider>
      <ModelsOverview models={mixedModels} />
    </SidebarProvider>,
  );
  fireEvent.change(screen.getByLabelText("labelSearch"), {
    target: { value: "qwen" },
  });
  await waitFor(() => expect(screen.queryByText("External chat")).toBeNull());
  expect(screen.getByText("Local chat")).toBeTruthy();
});

it("saves the name and Markdown documentation for a local model", async () => {
  client.execute.mockResolvedValue({ data: { id: "local" } });
  render(
    <ModelMetadataForm
      model={{
        id: "local",
        name: "Old",
        description: "",
        type: "ollama_llm_v1",
      }}
    />,
  );
  fireEvent.change(screen.getByLabelText("fields.name"), {
    target: { value: "New" },
  });
  fireEvent.change(screen.getByLabelText("fields.documentation"), {
    target: { value: "## Help" },
  });
  fireEvent.submit(screen.getByLabelText("fields.name").closest("form")!);
  await waitFor(() =>
    expect(client.execute).toHaveBeenCalledWith({
      id: "local",
      name: "New",
      description: "## Help",
    }),
  );
});
it("confirms registry-only local deletion and preserves the dialog on failure", async () => {
  client.execute.mockResolvedValue({ serverError: "failed" });
  render(
    <ModelMetadataForm
      model={{
        id: "local",
        name: "Old",
        description: "",
        type: "ollama_llm_v1",
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "labelDelete" }));
  expect(screen.getByText("descriptionDeleteLocal")).toBeTruthy();
  const dialog = screen.getByRole("alertdialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "labelDelete" }));
  await waitFor(() => expect(screen.getByText("errorDelete")).toBeTruthy());
  expect(screen.getByRole("alertdialog")).toBeTruthy();
});

it("refreshes a saved model without asking for its API key", async () => {
  const { discoverModels } =
    await import("../../apps/web/app/(settings)/models/_actions/discoverModels");
  vi.mocked(discoverModels).mockClear();
  render(
    <ExternalModelForm
      provider="openai"
      initial={{
        id: "saved",
        name: "Team",
        modelId: "chat",
        baseUrl: "https://api.openai.com/v1",
      }}
    />,
  );
  await waitFor(
    () => expect(discoverModels).toHaveBeenCalledWith({ id: "saved" }),
    { timeout: 2000 },
  );
  expect(
    (screen.getByLabelText("fields.apiKey") as HTMLInputElement).value,
  ).toBe("");
  vi.mocked(discoverModels).mockClear();
  fireEvent.click(screen.getByRole("button", { name: "labelLoadModels" }));
  await waitFor(
    () => expect(discoverModels).toHaveBeenCalledWith({ id: "saved" }),
    { timeout: 2000 },
  );
});

it("does not pass a saved key to an edited endpoint", async () => {
  const { discoverModels } =
    await import("../../apps/web/app/(settings)/models/_actions/discoverModels");
  vi.mocked(discoverModels).mockClear();
  render(
    <ExternalModelForm
      provider="openai-compatible"
      initial={{
        id: "saved",
        name: "Team",
        modelId: "chat",
        baseUrl: "https://api.example.com/v1",
      }}
    />,
  );
  fireEvent.change(screen.getByLabelText("fields.baseUrl"), {
    target: { value: "https://other.example.com/v1" },
  });
  await waitFor(
    () =>
      expect(discoverModels).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: "https://other.example.com/v1",
          apiKey: "",
        }),
      ),
    { timeout: 2000 },
  );
  expect(discoverModels).not.toHaveBeenCalledWith({ id: "saved" });
});
