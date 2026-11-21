import { afterEach, expect, it, vi } from "vitest";
import { PUT } from "../../apps/web/app/api/xrag/upload/[...path]/route";
const upstream = vi.hoisted(() => vi.fn());
vi.mock("undici", () => ({ fetch: upstream }));
const path = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "upload.xrag.tar",
];
const context = { params: Promise.resolve({ path }) };
afterEach(() => {
  upstream.mockReset();
  vi.unstubAllEnvs();
});
it("streams a public signed PUT to the fixed transfer bucket without forwarding client credentials", async () => {
  vi.stubEnv("SUPABASE_URL", "http://kong:8000");
  vi.stubEnv("SUPABASE_PUBLIC_ANON_KEY", "anon");
  upstream.mockResolvedValue(new Response(null, { status: 200 }));
  const req = new Request(
    "https://app.test/api/xrag/upload/" + path.join("/") + "?token=a%2Bb",
    { method: "PUT", headers: { authorization: "private" }, body: "archive" },
  );
  expect((await PUT(req, context)).status).toBe(200);
  expect(upstream).toHaveBeenCalledWith(
    new URL(
      "http://kong:8000/storage/v1/object/upload/sign/xrag-transfers/" +
        path.join("/") +
        "?token=a%2Bb",
    ),
    expect.objectContaining({
      method: "PUT",
      redirect: "error",
    }),
  );
  const [, init] = upstream.mock.calls[0]!;
  expect(await new Response(init.body).text()).toBe("archive");
  expect(new Headers(init?.headers).has("authorization")).toBe(false);
});
it.each([true, false])(
  "limits a signed PUT to 6 MiB with declared length %s",
  async (declareLength) => {
    vi.stubEnv("SUPABASE_URL", "http://kong:8000");
    vi.stubEnv("SUPABASE_PUBLIC_ANON_KEY", "anon");
    const size = 6 * 1024 ** 2 + 1;
    upstream.mockImplementation(async (_url, init) => {
      await new Response(init.body).arrayBuffer();
      return new Response();
    });
    const request = new Request("https://app.test/?token=signed", {
      method: "PUT",
      body: new Uint8Array(size),
      headers: declareLength ? { "content-length": String(size) } : {},
    });
    expect((await PUT(request, context)).status).toBe(413);
    expect(upstream).toHaveBeenCalledTimes(declareLength ? 0 : 1);
  },
);
it("rejects missing upload capabilities before contacting Storage", async () => {
  expect((await PUT(new Request("https://app.test/"), context)).status).toBe(
    400,
  );
  expect(upstream).not.toHaveBeenCalled();
});
