import { afterEach, expect, it, vi } from "vitest";
import { listExternalModels } from "../packages/realtime/src/models/listExternalModels";
import { createExternalLanguageModel } from "../packages/realtime/src/models/createExternalLanguageModel";
import { externalModelProviders } from "../packages/database/src/aiModel/_schema";
const input = {
  provider: "openai-compatible" as const,
  baseUrl: "https://provider.example/v1",
  apiKey: "private",
};
afterEach(() => vi.unstubAllGlobals());
it("lists compatible endpoints with bearer authentication and blocks redirects", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(Response.json({ data: [{ id: "chat" }] }));
  vi.stubGlobal("fetch", fetcher);
  expect(await listExternalModels(input)).toEqual({
    models: [{ id: "chat", name: "chat" }],
    manual: false,
  });
  expect(fetcher.mock.calls[0][0].href).toBe(
    "https://provider.example/v1/models",
  );
  expect(fetcher.mock.calls[0][1]).toMatchObject({
    headers: { Authorization: "Bearer private" },
    redirect: "error",
  });
});
it("uses Anthropic authentication and pagination", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        data: [{ id: "a", display_name: "Alpha" }],
        has_more: true,
        last_id: "a",
      }),
    )
    .mockResolvedValueOnce(
      Response.json({ data: [{ id: "b" }], has_more: false }),
    );
  vi.stubGlobal("fetch", fetcher);
  const result = await listExternalModels({ ...input, provider: "antropic" });
  expect(result.models).toHaveLength(2);
  expect(fetcher.mock.calls[0][1].headers).toEqual({
    "x-api-key": "private",
    "anthropic-version": "2023-06-01",
  });
  expect(fetcher.mock.calls[1][0].searchParams.get("after_id")).toBe("a");
});
it("filters Google models to generation and follows page tokens", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        models: [
          {
            name: "models/gemini",
            supportedGenerationMethods: ["generateContent"],
          },
          {
            name: "models/embed",
            supportedGenerationMethods: ["embedContent"],
          },
        ],
        nextPageToken: "next",
      }),
    )
    .mockResolvedValueOnce(Response.json({ models: [] }));
  vi.stubGlobal("fetch", fetcher);
  expect(
    (await listExternalModels({ ...input, provider: "google" })).models,
  ).toEqual([{ id: "gemini", name: "gemini" }]);
  expect(fetcher.mock.calls[1][0].searchParams.get("pageToken")).toBe("next");
  expect(fetcher.mock.calls[0][1].headers).toEqual({
    "x-goog-api-key": "private",
  });
});
it("lists Bedrock Anthropic models and inference profiles with explicit region and key", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        modelSummaries: [
          { modelId: "anthropic.chat", inferenceTypesSupported: ["ON_DEMAND"] },
        ],
      }),
    )
    .mockResolvedValueOnce(
      Response.json({
        inferenceProfileSummaries: [
          {
            inferenceProfileId: "eu.anthropic.chat",
            status: "ACTIVE",
            models: [
              {
                modelArn:
                  "arn:aws:bedrock:eu-central-1::foundation-model/anthropic.chat",
              },
            ],
          },
        ],
      }),
    );
  vi.stubGlobal("fetch", fetcher);
  expect(
    (
      await listExternalModels({
        ...input,
        provider: "antropic-aws",
        region: "eu-central-1",
      })
    ).models.map((m) => m.id),
  ).toEqual(["anthropic.chat", "eu.anthropic.chat"]);
  expect(fetcher.mock.calls[0][0]).toContain(
    "https://bedrock.eu-central-1.amazonaws.com/foundation-models",
  );
  expect(fetcher.mock.calls[0][1].headers.Authorization).toBe("Bearer private");
});
it("keeps Azure deployment names manual rather than listing unrelated catalog IDs", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect(
    await listExternalModels({ ...input, provider: "openai-azure" }),
  ).toEqual({ models: [], manual: true });
  expect(fetcher).not.toHaveBeenCalled();
});
it("does not leak transport error credentials", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("private")));
  await expect(listExternalModels(input)).rejects.toThrow(
    /^MODEL_DISCOVERY_FAILED$/,
  );
});
it.each(externalModelProviders)(
  "constructs a native adapter for %s",
  (provider) => {
    const model = createExternalLanguageModel(
      {
        provider,
        baseUrl: input.baseUrl,
        modelId: "chat",
        region: "eu-central-1",
      },
      "private",
    );
    expect(model.modelId).toBe("chat");
    expect(model.specificationVersion).toBe("v4");
    if (provider === "openai" || provider === "openai-azure")
      expect(model.provider).toContain("responses");
  },
);
it.each(externalModelProviders.filter((p) => p !== "openai-compatible"))(
  "never falls back to server environment credentials for %s",
  (provider) => {
    expect(() =>
      createExternalLanguageModel(
        {
          provider,
          baseUrl: input.baseUrl,
          modelId: "chat",
          region: "eu-central-1",
        },
        "",
      ),
    ).toThrow("MODEL_API_KEY_REQUIRED");
  },
);
