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
it("bounds, deduplicates and validates remote model names without requiring a key for compatible providers", async () => {
  const fetcher = vi.fn().mockResolvedValue(
    Response.json({
      data: [
        { id: "" },
        { id: 123 },
        { id: "x".repeat(501) },
        { id: "z", displayName: "Zed" },
        { id: "a", display_name: 123 },
        { id: "z", display_name: "Latest" },
        ...Array.from({ length: 2100 }, (_, index) => ({
          id: `model-${String(index).padStart(4, "0")}`,
          display_name: "n".repeat(600),
        })),
      ],
    }),
  );
  vi.stubGlobal("fetch", fetcher);
  const result = await listExternalModels({ ...input, apiKey: "" });
  expect(result.models).toHaveLength(2000);
  expect(result.models[0]).toEqual({ id: "a", name: "a" });
  expect(result.models.at(-1)).toEqual({ id: "z", name: "Latest" });
  expect(result.models[1]!.name).toHaveLength(500);
  expect(fetcher.mock.calls[0][1].headers).toEqual({});
  expect(fetcher).toHaveBeenCalledOnce();
});

it.each([{}, { data: null }, { data: [], has_more: true, last_id: 12 }])(
  "sanitizes malformed provider catalogs or cursors",
  async (body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));
    await expect(
      listExternalModels({ ...input, provider: "antropic" }),
    ).rejects.toThrow(/^MODEL_DISCOVERY_FAILED$/);
  },
);

it("stops repeated page cursors and drops Google rows without a usable generation ID", async () => {
  const fetcher = vi.fn().mockImplementation(async () =>
    Response.json({
      models: [
        { name: "models/no-generation" },
        { supportedGenerationMethods: ["generateContent"] },
        {
          name: "models/chat",
          displayName: "Chat",
          supportedGenerationMethods: ["generateContent"],
        },
      ],
      nextPageToken: "same",
    }),
  );
  vi.stubGlobal("fetch", fetcher);
  expect(
    (await listExternalModels({ ...input, provider: "google" })).models,
  ).toEqual([{ id: "chat", name: "Chat" }]);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it.each([undefined, "invalid-region"])(
  "rejects invalid Bedrock region %s before network access",
  async (region) => {
    await expect(
      listExternalModels({ ...input, provider: "antropic-aws", region }),
    ).rejects.toThrow(/^MODEL_DISCOVERY_FAILED$/);
    expect(fetch).not.toHaveBeenCalled();
  },
);

it("filters unusable Bedrock profiles, follows cursors and preserves model display names", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        modelSummaries: [
          {
            modelId: "valid",
            modelName: "Named model",
            inferenceTypesSupported: ["ON_DEMAND"],
          },
          { modelId: 1 },
          { modelId: "no-inference" },
          { modelId: "provisioned", inferenceTypesSupported: ["PROVISIONED"] },
        ],
      }),
    )
    .mockResolvedValueOnce(
      Response.json({
        inferenceProfileSummaries: [
          { status: "INACTIVE", inferenceProfileId: "inactive" },
          { status: "ACTIVE" },
          { status: "ACTIVE", inferenceProfileId: "no-models" },
          {
            status: "ACTIVE",
            inferenceProfileId: "wrong-model",
            models: [{}, { modelArn: "other" }],
          },
        ],
        nextToken: "next/profile",
      }),
    )
    .mockResolvedValueOnce(
      Response.json({
        inferenceProfileSummaries: [
          {
            status: "ACTIVE",
            inferenceProfileId: "profile",
            inferenceProfileName: "Named profile",
            models: [{ modelArn: "anthropic.chat" }],
          },
        ],
        nextToken: "next/profile",
      }),
    );
  vi.stubGlobal("fetch", fetcher);
  expect(
    (
      await listExternalModels({
        ...input,
        provider: "antropic-aws",
        region: "eu-west-1",
      })
    ).models,
  ).toEqual([
    { id: "profile", name: "Named profile" },
    { id: "valid", name: "Named model" },
  ]);
  expect(fetcher.mock.calls[2][0]).toContain("nextToken=next%2Fprofile");
  expect(fetcher).toHaveBeenCalledTimes(3);
});

it.each(["http-error", "malformed-foundations", "malformed-profiles"])(
  "sanitizes Bedrock failure %s",
  async (failure) => {
    const fetcher = vi.fn();
    if (failure === "http-error")
      fetcher.mockResolvedValue(new Response("private", { status: 403 }));
    else if (failure === "malformed-foundations")
      fetcher.mockResolvedValue(Response.json({ modelSummaries: {} }));
    else
      fetcher
        .mockResolvedValueOnce(Response.json({ modelSummaries: [] }))
        .mockResolvedValue(Response.json({ inferenceProfileSummaries: null }));
    vi.stubGlobal("fetch", fetcher);
    await expect(
      listExternalModels({
        ...input,
        provider: "antropic-aws",
        region: "eu-west-1",
      }),
    ).rejects.toThrow(/^MODEL_DISCOVERY_FAILED$/);
  },
);
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
