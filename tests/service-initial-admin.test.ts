import { EventEmitter } from "node:events";
import { createInterface } from "node:readline/promises";
import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createInitialAdminWithResetKey } from "../packages/database/src/user/createInitialAdminWithResetKey.ts";
import { hasUsers } from "../packages/database/src/user/hasUsers.ts";
import { configSchema, type Context } from "../packages/service/src/config.ts";
import {
  initialAdminCommand,
  setupInitialAdmin,
} from "../packages/service/src/initialAdmin.ts";
import { initialAdminMessages } from "../packages/service/src/initialAdminMessages.ts";

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn(() => ({})) }));
vi.mock("node:readline/promises", () => ({ createInterface: vi.fn() }));
vi.mock(
  "../packages/database/src/user/createInitialAdminWithResetKey.ts",
  () => ({ createInitialAdminWithResetKey: vi.fn() }),
);
vi.mock("../packages/database/src/user/hasUsers.ts", () => ({
  hasUsers: vi.fn(),
}));
let context: Context;
let output: ReturnType<typeof vi.spyOn>;
let prompt: EventEmitter & {
  question: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
};
const ttyDescriptors = [process.stdin, process.stdout].map((stream) =>
  Object.getOwnPropertyDescriptor(stream, "isTTY"),
);
afterEach(() => {
  [process.stdin, process.stdout].forEach((stream, index) => {
    const descriptor = ttyDescriptors[index];
    if (descriptor) Object.defineProperty(stream, "isTTY", descriptor);
    else Reflect.deleteProperty(stream, "isTTY");
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(process.stdin, "isTTY", {
    configurable: true,
    get: () => true,
  });
  Object.defineProperty(process.stdout, "isTTY", {
    configurable: true,
    get: () => true,
  });
  vi.stubEnv("LC_ALL", "en_US.UTF-8");
  output = vi.spyOn(console, "log").mockImplementation(() => {});
  context = {
    configPath: "/tmp/machine/config.json",
    root: "/tmp/machine",
    config: configSchema.parse({
      version: 1,
      id: "11111111-1111-4111-8111-111111111111",
      services: ["core", "supabase"],
    }),
    environment: {
      SERVICE_ROLE_KEY: "private-service-key",
      SITE_URL: "https://localhost",
    },
  };
  prompt = Object.assign(new EventEmitter(), {
    question: vi.fn().mockResolvedValue(" admin@example.test "),
    close: vi.fn(() => prompt.emit("close")),
  });
  vi.mocked(createInterface).mockReturnValue(
    prompt as unknown as ReturnType<typeof createInterface>,
  );
  vi.mocked(hasUsers).mockResolvedValue(false);
  vi.mocked(createInitialAdminWithResetKey).mockResolvedValue({
    userId: "new-admin",
    passwordResetKey: "one-time-secret",
    expires: "2026-11-09T00:00:00.000Z",
  });
});

it("prints the verified account's one-time key and browser instructions without service credentials", async () => {
  await setupInitialAdmin(context);
  expect(createClient).toHaveBeenCalledWith(
    "http://127.0.0.1:8085",
    "private-service-key",
    expect.objectContaining({
      auth: expect.objectContaining({ persistSession: false }),
    }),
  );
  expect(createInitialAdminWithResetKey).toHaveBeenCalledWith(
    { email: "admin@example.test" },
    expect.any(Object),
  );
  expect(output).toHaveBeenCalledWith("https://localhost/signin/reset");
  expect(output).toHaveBeenCalledWith("One-time key:", "one-time-secret");
  expect(output.mock.calls.flat().join(" ")).not.toContain(
    "private-service-key",
  );
  expect(prompt.close).toHaveBeenCalledOnce();
});

it("validates email input before creating an account", async () => {
  prompt.question.mockResolvedValueOnce("invalid");
  await setupInitialAdmin(context);
  expect(prompt.question).toHaveBeenCalledTimes(2);
  expect(createInitialAdminWithResetKey).toHaveBeenCalledOnce();
});

it.each(["stdin", "stdout"] as const)(
  "never creates or prints secrets when %s is redirected",
  async (stream) => {
    vi.spyOn(process[stream], "isTTY", "get").mockReturnValue(false);
    await setupInitialAdmin(context);
    expect(createClient).not.toHaveBeenCalled();
    expect(createInitialAdminWithResetKey).not.toHaveBeenCalled();
    expect(output).toHaveBeenCalledWith(
      expect.stringContaining("skipped"),
      expect.stringContaining("setup-admin"),
    );
  },
);

it("skips on an empty answer without creating an account", async () => {
  prompt.question.mockResolvedValue("");
  await setupInitialAdmin(context);
  expect(createInitialAdminWithResetKey).not.toHaveBeenCalled();
});

it.each(["close", "SIGINT"])("cancels safely on %s", async (event) => {
  prompt.question.mockImplementation(async (_question, { signal }) => {
    queueMicrotask(() => prompt.emit(event));
    return new Promise((_resolve, reject) =>
      signal.addEventListener("abort", () => reject(signal.reason), {
        once: true,
      }),
    );
  });
  await setupInitialAdmin(context);
  expect(createInitialAdminWithResetKey).not.toHaveBeenCalled();
  expect(prompt.close).toHaveBeenCalledOnce();
});

it("does not prompt when users already exist", async () => {
  vi.mocked(hasUsers).mockResolvedValue(true);
  await setupInitialAdmin(context);
  expect(createInterface).not.toHaveBeenCalled();
  expect(createInitialAdminWithResetKey).not.toHaveBeenCalled();
});

it("handles a user created while the operator was entering an email", async () => {
  vi.mocked(createInitialAdminWithResetKey).mockRejectedValue(
    new Error("INITIAL_ADMIN_EXISTS"),
  );
  await setupInitialAdmin(context);
  expect(output).toHaveBeenCalledWith(initialAdminMessages().existing);
  expect(output.mock.calls.flat()).not.toContain("one-time-secret");
});

it("reports database failures without connection details and includes the retry command", async () => {
  vi.mocked(hasUsers).mockRejectedValue(new Error("private-service-key"));
  await expect(setupInitialAdmin(context)).rejects.toThrow("setup-admin");
  await expect(setupInitialAdmin(context)).rejects.not.toThrow(
    "private-service-key",
  );
  expect(createInterface).not.toHaveBeenCalled();
});

it("requires a configured web instance before prompting or mutating", async () => {
  context.config.services = ["supabase"];
  await expect(setupInitialAdmin(context)).rejects.toThrow("requires Core");
  expect(createClient).not.toHaveBeenCalled();
});

it("localizes the setup in German and English and quotes custom config paths", () => {
  const de = initialAdminMessages({ LANG: "de_AT.UTF-8" });
  const en = initialAdminMessages({
    LC_ALL: "en_US.UTF-8",
    LANG: "de_AT.UTF-8",
  });
  expect(Object.keys(de)).toEqual(Object.keys(en));
  expect(de.prompt).toContain("E-Mail-Adresse");
  expect(en.prompt).toContain("Email");
  expect(initialAdminCommand("/tmp/Thomas' machine/config.json")).toBe(
    "npx schornai service setup-admin --config '/tmp/Thomas'\\'' machine/config.json'",
  );
});
