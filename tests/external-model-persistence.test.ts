import { describe, expect, it, vi } from "vitest";
import { createExternalAIModel } from "../packages/database/src/aiModel/createExternalAIModel";
import { getExternalAIModelConnection } from "../packages/database/src/aiModel/getExternalAIModelConnection";

import { updateExternalAIModel } from "../packages/database/src/aiModel/updateExternalAIModel";

const input = {
  name: "Test model",
  contextSize: 32768,
  modelId: "chat",
  baseUrl: "https://example.com/v1",
  apiKey: "private-key",
};

describe("external model persistence boundary", () => {
  it("creates metadata and credentials in a single server-only transaction", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "model-id", error: null });
    const id = await createExternalAIModel(input, { supabase: { rpc } as any });
    expect(id).toBe("model-id");
    expect(rpc).toHaveBeenCalledExactlyOnceWith("create_external_ai_model", {
      model_name: input.name,
      external_model_id: input.modelId,
      context_size: 32768,
      base_url: input.baseUrl,
      api_key: input.apiKey,
      provider: "openai-compatible",
    });
  });

  it.each(["database", "transport"])(
    "keeps transaction %s failures private",
    async (failure) => {
      const rpc = vi.fn();
      if (failure === "transport")
        rpc.mockRejectedValue(new Error(input.apiKey));
      else rpc.mockResolvedValue({ error: { message: input.apiKey } });
      await expect(
        createExternalAIModel(input, { supabase: { rpc } as any }),
      ).rejects.toThrow("MODEL_CREATE_FAILED");
      await expect(
        updateExternalAIModel(
          { ...input, id: "model-id", provider: "openai-compatible" },
          { supabase: { rpc } as any },
        ),
      ).rejects.toThrow("MODEL_UPDATE_FAILED");
    },
  );

  it("atomically updates the endpoint and key, preserving the blank-key sentinel", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    await updateExternalAIModel(
      { ...input, id: "model-id", provider: "openai-compatible", apiKey: "" },
      { supabase: { rpc } as any },
    );
    expect(rpc).toHaveBeenCalledExactlyOnceWith("update_external_ai_model", {
      target_model_id: "model-id",
      external_model_id: input.modelId,
      context_size: 32768,
      base_url: input.baseUrl,
      api_key: "",
      provider: "openai-compatible",
    });
  });

  it("hides transport errors during credential lookup", async () => {
    const single = vi.fn().mockRejectedValue(new Error(input.apiKey));
    const query = { eq: vi.fn(), single };
    query.eq.mockReturnValue(query);
    const supabase = { from: () => ({ select: () => query }) };
    await expect(
      getExternalAIModelConnection(
        { id: "model-id" },
        { supabase: supabase as any },
      ),
    ).rejects.toThrow("MODEL_CREDENTIALS_UNAVAILABLE");
  });

  it.each([
    { type: "ollama_llm_v1", config: {} },
    { type: "external_llm_v1", config: {} },
    {
      type: "external_llm_v1",
      config: {},
      ai_model_credentials: { api_key: "secret" },
    },
  ])(
    "does not return credentials for a missing or invalid external connection",
    async (data) => {
      const query = {
        eq: vi.fn(),
        single: vi.fn().mockResolvedValue({ data }),
      };
      query.eq.mockReturnValue(query);
      const supabase = { from: () => ({ select: () => query }) };
      await expect(
        getExternalAIModelConnection(
          { id: "model-id" },
          { supabase: supabase as any },
        ),
      ).rejects.toThrow("MODEL_CREDENTIALS_UNAVAILABLE");
    },
  );
});
