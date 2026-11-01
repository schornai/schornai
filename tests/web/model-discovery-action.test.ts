import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  key: vi.fn(),
  list: vi.fn(),
}));
vi.mock("@/lib/serverActionClient", () => ({
  serverActionClient: {
    inputSchema: (schema: any) => ({
      action: (handler: any) => (input: unknown) =>
        handler({ parsedInput: schema.parse(input) }),
    }),
  },
}));
vi.mock("@/lib/supabase/saveCreateSupabaseServiceRoleClient", () => ({
  saveCreateSupabaseServiceRoleClient: mocks.authorize,
}));
vi.mock(
  "@schornio/aibox-package-database/aiModel/getExternalAIModelConnection",
  () => ({
    getExternalAIModelConnection: mocks.key,
  }),
);
vi.mock("@schornio/aibox-realtime/models/listExternalModels", () => ({
  listExternalModels: mocks.list,
}));
import { discoverModels } from "../../apps/web/app/(settings)/models/_actions/discoverModels";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.authorize.mockResolvedValue({});
  mocks.key.mockResolvedValue({
    apiKey: "saved-secret",
    config: { provider: "openai", baseUrl: "https://api.openai.com/v1" },
  });
  mocks.list.mockResolvedValue({ models: [] });
});
it("uses stored credentials and returns only the catalog", async () => {
  expect(await discoverModels({ id: "saved" })).toEqual({ models: [] });
  expect(mocks.list).toHaveBeenCalledWith({
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "saved-secret",
  });
});
it("authorizes before reading credentials", async () => {
  mocks.authorize.mockRejectedValue(new Error("NOT_AUTHORIZED"));
  await expect(discoverModels({ id: "saved" })).rejects.toThrow(
    "NOT_AUTHORIZED",
  );
  expect(mocks.key).not.toHaveBeenCalled();
  expect(mocks.list).not.toHaveBeenCalled();
});
it("rejects a caller-supplied URL with a saved credential request", async () => {
  await expect(async () =>
    discoverModels({
      id: "saved",
      baseUrl: "https://other.example.com",
    } as any),
  ).rejects.toThrow();
  expect(mocks.key).not.toHaveBeenCalled();
  expect(mocks.list).not.toHaveBeenCalled();
});
it("does not discover models if the saved connection cannot be read", async () => {
  mocks.key.mockRejectedValue(new Error("MODEL_CREDENTIALS_UNAVAILABLE"));
  await expect(discoverModels({ id: "local" })).rejects.toThrow(
    "MODEL_CREDENTIALS_UNAVAILABLE",
  );
  expect(mocks.list).not.toHaveBeenCalled();
});
