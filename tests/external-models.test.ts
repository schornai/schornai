import { beforeEach, describe, expect, it, vi } from "vitest";
import { externalModelInputSchema } from "../apps/web/app/(settings)/models/externalModelInputSchema";
import { toModelSummary } from "../apps/web/app/(settings)/models/modelSummary";
import { getChatModel } from "@schornio/aibox-realtime/models/getChatModel";

const mocks = vi.hoisted(() => ({
  local: vi.fn(),
  create: vi.fn(),
  chatModel: vi.fn(),
}));
vi.mock("@schornio/aibox-realtime/_lib/aiboxModel", () => ({
  aiboxModel: mocks.local,
}));
vi.mock("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: mocks.create,
}));
const input = {
  name: " Team model ",
  modelId: "provider/chat",
  baseUrl: "https://api.example.com/v1/",
  apiKey: "secret",
};
const external = {
  id: "ext",
  name: "External",
  identifier: "external:uuid",
  type: "external_llm_v1",
  config: {
    provider: "openai-compatible",
    modelId: "provider/chat",
    baseUrl: "https://api.example.com/v1",
    headers: {},
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  const model = {
    specificationVersion: "v4",
    provider: "test",
    modelId: "test",
    supportedUrls: {},
  };
  mocks.local.mockReturnValue(model);
  mocks.chatModel.mockReturnValue(model);
  mocks.create.mockReturnValue({ chatModel: mocks.chatModel });
});
describe("external model input and public metadata", () => {
  it("normalizes names and URLs", () => {
    expect(externalModelInputSchema.parse(input)).toMatchObject({
      name: "Team model",
      baseUrl: "https://api.example.com/v1",
    });
  });
  it.each([
    "not-a-url",
    "http://example.com/v1",
    "https://user:secret@example.com/v1",
    "https://example.com/v1?key=secret",
    "https://example.com/v1#secret",
    "file:///etc/passwd",
  ])("rejects unsafe URL %s", (baseUrl) => {
    expect(
      externalModelInputSchema.safeParse({ ...input, baseUrl }).success,
    ).toBe(false);
  });
  it("rejects blank model IDs and header injection", () => {
    expect(
      externalModelInputSchema.safeParse({ ...input, modelId: " " }).success,
    ).toBe(false);
    expect(
      externalModelInputSchema.safeParse({
        ...input,
        apiKey: "key\r\nX-Header: value",
      }).success,
    ).toBe(false);
  });
  it("does not serialize credentials to model cards or detail pages", () => {
    const summary = toModelSummary({
      ...external,
      config: {
        ...external.config,
        headers: { Authorization: "secret" },
        apiKey: "secret",
      },
    } as any);
    expect(JSON.stringify(summary)).not.toContain("secret");
    expect(summary.modelId).toBe("provider/chat");
  });
});
describe("chat model selection", () => {
  it("keeps local models on the distributed worker", async () => {
    const context = {} as any;
    await getChatModel("qwen3:8b", context);
    expect(mocks.local).toHaveBeenCalledWith("qwen3:8b", context);
  });
  it("loads external credentials server-side and uses the provider model ID", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { ...external, ai_model_credentials: { api_key: "secret" } },
    });
    const query = { single, eq: vi.fn() };
    query.eq.mockReturnValue(query);
    const select = vi.fn().mockReturnValue(query);
    const from = vi.fn().mockReturnValue({ select });
    await getChatModel("external:uuid", {
      supabaseServiceRole: { from },
    } as any);
    expect(from).toHaveBeenCalledExactlyOnceWith("ai_models");
    expect(select).toHaveBeenCalledWith(
      "type, config, ai_model_credentials!inner(api_key)",
    );
    expect(query.eq).toHaveBeenCalledWith("identifier", "external:uuid");
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "https://api.example.com/v1",
        apiKey: "secret",
      }),
    );
    expect(mocks.chatModel).toHaveBeenCalledWith("provider/chat");
    expect(mocks.local).not.toHaveBeenCalled();
  });
  it("does not expose credential database errors", async () => {
    const single = vi.fn().mockResolvedValue({ error: { message: "secret" } });
    const query = { single, eq: vi.fn() };
    query.eq.mockReturnValue(query);
    const from = () => ({ select: () => query });
    await expect(
      getChatModel("external:uuid", { supabaseServiceRole: { from } } as any),
    ).rejects.toThrow("MODEL_CREDENTIALS_UNAVAILABLE");
    expect(mocks.create).not.toHaveBeenCalled();
  });
});

it.each([null, undefined, 32768])(
  "accepts optional context size %s",
  (contextSize) => {
    expect(
      externalModelInputSchema.safeParse({ ...input, contextSize }).success,
    ).toBe(true);
  },
);
it.each([0, -1, 1.5, 2147483648])(
  "rejects invalid context size %s",
  (contextSize) => {
    expect(
      externalModelInputSchema.safeParse({ ...input, contextSize }).success,
    ).toBe(false);
  },
);
