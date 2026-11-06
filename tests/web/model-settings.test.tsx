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
  act,
} from "@testing-library/react";
import { ModelMetadataForm } from "../../apps/web/app/(settings)/models/_components/ModelMetadataForm";
import { ExternalModelForm } from "../../apps/web/app/(settings)/models/_components/ExternalModelForm";
import { SidebarProvider } from "@schornio/aibox-package-ui/components/sidebar";
import { ModelsOverview } from "../../apps/web/app/(settings)/models/_components/ModelsOverview";
import { ModelDetails } from "../../apps/web/app/(settings)/models/_components/ModelDetails";
import { toModelSummary } from "../../apps/web/app/(settings)/models/modelSummary";
import { discoverModels } from "../../apps/web/app/(settings)/models/_actions/discoverModels";
import userEvent from "@testing-library/user-event";
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
  client.push.mockReset();
  vi.mocked(discoverModels)
    .mockReset()
    .mockResolvedValue({ data: { models: [] } });
});

it("copies only public model metadata into a client summary", () => {
  const config = {
    contextSize: 8192,
    embeddingVectorSize: 768,
    featureThinking: true,
    featureTools: false,
    featureVision: true,
    fileSystemIdentifier: "model-files",
    provider: "antropic-aws",
    baseUrl: "https://runtime.test",
    region: "eu-west-1",
    modelId: "remote-model",
    apiKey: "must-stay-private",
    extraCredential: "also-private",
  };
  const model = {
    id: "model",
    name: "Example",
    description: "Documentation",
    identifier: "external:example",
    type: "external_llm_v1",
    config,
    credentials: "private-top-level",
  };
  expect(toModelSummary(model as any)).toEqual({
    id: model.id,
    name: model.name,
    description: model.description,
    identifier: model.identifier,
    type: model.type,
    contextSize: 8192,
    embeddingVectorSize: 768,
    featureThinking: true,
    featureTools: false,
    featureVision: true,
    fileSystemIdentifier: "model-files",
    provider: "antropic-aws",
    baseUrl: "https://runtime.test",
    region: "eu-west-1",
    modelId: "remote-model",
  });
  expect(
    JSON.stringify(toModelSummary({ ...model, config: {} } as any)),
  ).not.toContain("private");
  expect(
    toModelSummary({ ...model, config: {} } as any).contextSize,
  ).toBeUndefined();
});

it.each([
  {
    type: "ollama_llm_v1",
    config: {
      contextSize: 8192,
      featureThinking: true,
      featureTools: false,
      featureVision: true,
    },
    description: "Usage documentation",
  },
  {
    type: "ollama_embedding_v1",
    config: { contextSize: 4096, embeddingVectorSize: 768 },
    description: "",
  },
  {
    type: "mlx_whisper_v1",
    config: { fileSystemIdentifier: "local-whisper" },
    description: undefined,
  },
  {
    type: "external_llm_v1",
    config: {
      provider: "antropic-aws",
      baseUrl: "https://bedrock.test",
      region: "eu-west-1",
      modelId: "remote-model",
    },
    description: "Cloud usage",
  },
  { type: "external_llm_v1", config: {}, description: "" },
])(
  "shows appropriate $type properties, connection settings and documentation",
  ({ type, config, description }) => {
    const model = toModelSummary({
      id: "model",
      name: "Example",
      identifier: "model-identifier",
      type,
      config,
      description,
    } as any);
    const { container } = render(<ModelDetails model={model} />);
    fireEvent.click(
      screen.getByRole("button", { name: "labelModelProperties" }),
    );
    expect(screen.getByText("labelIdentifier")).toBeTruthy();
    expect(Boolean(screen.queryByText("labelContextSize"))).toBe(
      "contextSize" in config,
    );
    expect(Boolean(screen.queryByText("labelEmbeddingSize"))).toBe(
      "embeddingVectorSize" in config,
    );
    if ("featureTools" in config)
      expect(screen.getByText("labelNo")).toBeTruthy();
    if (type === "external_llm_v1") {
      fireEvent.click(screen.getByRole("button", { name: "labelConnection" }));
      expect(screen.getByText("labelBaseUrl")).toBeTruthy();
      expect(Boolean(screen.queryByText("fields.region"))).toBe(
        "region" in config,
      );
      expect(
        container.querySelector('a[href="?view=connection"]'),
      ).not.toBeNull();
    } else
      expect(
        screen.queryByRole("button", { name: "labelConnection" }),
      ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "fields.documentation" }),
    );
    expect(
      screen.getByText(description || "descriptionNoDocumentation"),
    ).toBeTruthy();
    expect(container.querySelector('a[href="?view=settings"]')).not.toBeNull();
  },
);

it("saves Azure deployment names manually without discovering models", async () => {
  client.execute.mockResolvedValue({ data: { id: "azure-model" } });
  render(<ExternalModelForm provider="openai-azure" />);
  fireEvent.change(screen.getByLabelText("fields.baseUrl"), {
    target: { value: "https://team.openai.azure.com/openai/v1" },
  });
  fireEvent.change(screen.getByLabelText("fields.deployment"), {
    target: { value: "production-deployment" },
  });
  fireEvent.change(screen.getByLabelText("fields.apiKey"), {
    target: { value: "private-test-key" },
  });
  fireEvent.submit(screen.getByLabelText("fields.deployment").closest("form")!);
  await waitFor(() =>
    expect(client.push).toHaveBeenCalledWith("/models/azure-model"),
  );
  expect(client.execute).toHaveBeenCalledWith(
    expect.objectContaining({
      modelId: "production-deployment",
      apiKey: "private-test-key",
    }),
  );
  expect(
    (screen.getByLabelText("fields.apiKey") as HTMLInputElement).value,
  ).toBe("");
  expect(discoverModels).not.toHaveBeenCalled();
});

it("uses the selected Bedrock region for discovery and saves connection updates without navigation", async () => {
  vi.useFakeTimers();
  client.execute.mockResolvedValue({ data: { id: "saved" } });
  render(
    <ExternalModelForm
      provider="antropic-aws"
      initial={{
        id: "saved",
        name: "Bedrock",
        modelId: "model",
        region: "eu-west-1",
      }}
    />,
  );
  fireEvent.change(screen.getByLabelText("fields.region"), {
    target: { value: "us-east-1" },
  });
  fireEvent.change(screen.getByLabelText("fields.apiKey"), {
    target: { value: "replacement-key" },
  });
  await act(() => vi.advanceTimersByTimeAsync(700));
  expect(discoverModels).toHaveBeenCalledWith(
    expect.objectContaining({
      provider: "antropic-aws",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
      region: "us-east-1",
      apiKey: "replacement-key",
    }),
  );
  await act(async () =>
    fireEvent.submit(screen.getByLabelText("fields.region").closest("form")!),
  );
  expect(client.execute).toHaveBeenCalledWith(
    expect.objectContaining({
      id: "saved",
      region: "us-east-1",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
    }),
  );
  expect(client.refresh).toHaveBeenCalledOnce();
  expect(client.push).not.toHaveBeenCalled();
});

it("shows discovery errors without erasing a manually entered model ID and permits retry", async () => {
  vi.useFakeTimers();
  vi.mocked(discoverModels)
    .mockResolvedValueOnce(undefined)
    .mockResolvedValueOnce({
      data: { models: [{ id: "discovered", name: "Discovered" }] },
    });
  render(<ExternalModelForm provider="openai-compatible" />);
  fireEvent.change(screen.getByLabelText("fields.baseUrl"), {
    target: { value: "https://models.test/v1" },
  });
  fireEvent.change(screen.getByLabelText("fields.modelId"), {
    target: { value: "manual-model" },
  });
  await act(() => vi.advanceTimersByTimeAsync(700));
  expect(screen.getByText("errorDiscovery")).toBeTruthy();
  expect(
    (screen.getByLabelText("fields.modelId") as HTMLInputElement).value,
  ).toBe("manual-model");
  fireEvent.click(screen.getByRole("button", { name: "labelLoadModels" }));
  await act(() => vi.advanceTimersByTimeAsync(700));
  expect(screen.getByText("labelModelsFound")).toBeTruthy();
});

it("selects a discovered model by its public name and submits its exact identifier", async () => {
  vi.mocked(discoverModels).mockResolvedValue({
    data: {
      models: [
        { id: "named", name: "Friendly model" },
        { id: "same", name: "same" },
        { id: "plain" },
      ],
    },
  });
  client.execute.mockResolvedValue({ data: { id: "saved" } });
  render(
    <ExternalModelForm
      provider="openai-compatible"
      initial={{
        id: "saved",
        name: "Connection",
        modelId: "",
        baseUrl: "https://models.test/v1",
      }}
    />,
  );
  await screen.findByText("labelModelsFound");
  const input = screen.getByLabelText("fields.modelId");
  await userEvent.click(input);
  fireEvent.keyDown(input, { key: "ArrowDown" });
  expect(await screen.findByRole("option", { name: "plain" })).toBeTruthy();
  expect(screen.getByRole("option", { name: "same" })).toBeTruthy();
  await userEvent.click(
    screen.getByRole("option", { name: /named.*Friendly model/ }),
  );
  expect((input as HTMLInputElement).value).toBe("named");
  fireEvent.submit(input.closest("form")!);
  await waitFor(() =>
    expect(client.execute).toHaveBeenCalledWith(
      expect.objectContaining({ id: "saved", modelId: "named" }),
    ),
  );
});

it("accepts a custom identifier when discovery has no matching model", async () => {
  render(
    <ExternalModelForm
      provider="openai-compatible"
      initial={{
        id: "saved",
        name: "Connection",
        modelId: "",
        baseUrl: "https://models.test/v1",
      }}
    />,
  );
  const input = screen.getByLabelText("fields.modelId");
  await userEvent.type(input, "private-model");
  fireEvent.keyDown(input, { key: "ArrowDown" });
  await userEvent.click(
    await screen.findByRole("option", { name: "labelUseModelIdentifier" }),
  );
  expect((input as HTMLInputElement).value).toBe("private-model");
  fireEvent.submit(input.closest("form")!);
  await waitFor(() =>
    expect(client.execute).toHaveBeenCalledWith(
      expect.objectContaining({ modelId: "private-model" }),
    ),
  );
});

it.each(["resolve", "reject"])(
  "ignores a stale discovery request that later %ss after editing the endpoint",
  async (outcome) => {
    vi.useFakeTimers();
    const gate = Promise.withResolvers<any>();
    vi.mocked(discoverModels)
      .mockReturnValueOnce(gate.promise)
      .mockResolvedValue({ data: { models: [] } });
    render(<ExternalModelForm provider="openai-compatible" />);
    fireEvent.change(screen.getByLabelText("fields.baseUrl"), {
      target: { value: "https://models.test/v1" },
    });
    await act(() => vi.advanceTimersByTimeAsync(700));
    expect(screen.getByText("labelLoadingModels")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("fields.baseUrl"), {
      target: { value: "https://new.test/v1" },
    });
    await act(() => vi.advanceTimersByTimeAsync(700));
    await act(async () => {
      if (outcome === "resolve")
        gate.resolve({ data: { models: [{ id: "stale", name: "Stale" }] } });
      else gate.reject(new Error("stale failure"));
    });
    expect(screen.getByText("labelModelsFound")).toBeTruthy();
    expect(screen.queryByText("errorDiscovery")).toBeNull();
  },
);

it("disables repeated model saves while an action is pending", () => {
  client.pending = true;
  render(<ExternalModelForm provider="openai" />);
  fireEvent.submit(screen.getByLabelText("fields.apiKey").closest("form")!);
  expect(client.execute).not.toHaveBeenCalled();
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
