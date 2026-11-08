import { describe, it, expect } from "vitest";
import { Doc } from "yjs";
import { calculate } from "../packages/realtime/src/tools/calculate.ts";
import { currentDateTime } from "../packages/realtime/src/tools/currentDateTime.ts";
import { setActivityLabel } from "../packages/realtime/src/documents/activity/setActivityLabel.ts";
import { upsertActivity } from "../packages/realtime/src/documents/activity/upsertActivity.ts";
import { getResponseSuggestions } from "../packages/realtime/src/documents/chat/getResponseSuggestions.ts";
import type { ChatMessage } from "../packages/database/src/chat/_types.ts";

describe("calculator", () => {
  it.each([
    ["3283 + 2342", 5625],
    ["23 * 32 + 1", 737],
    ["(42 + 2) / 34", 44 / 34],
    ["sqrt(5)", Math.sqrt(5)],
    ["sin(pi / 2)", 1],
    ["cos(0)", 1],
    ["ln(e)", 1],
    ["log(100)", 2],
    ["10 mod 3", 1],
    ["mod(-5;3)", 1],
    ["avg(2;4;5)", 11 / 3],
    ["sum (1;2;3)", 6],
    ["min([3,1,5])", 1],
    ["max(1;2;3)", 3],
    ["2^3^2", 512],
    ["-2^2", -4],
    ["0.1+0.2", 0.3],
    ["sum([1;2;3];sqrt(4))", 8],
    ["pow(2,3)", 8],
  ])("evaluates %s", (input, expected) =>
    expect(calculate(input as string)).toBeCloseTo(expected as number),
  );
  it.each([
    "",
    "1/0",
    "sqrt(-1)",
    "log(0)",
    "sum()",
    "sin(1,2)",
    "a=2",
    "f(x)=x",
    "import(1)",
    "evaluate(1)",
    "zeros(1000000000)",
    "1:1000000",
    "[1,2]",
    "pi.constructor",
    '"text"',
    "true",
    "constructor(1)",
    "[[1,2]]",
    "sin([1,2])",
    "1e999",
    "1;2",
    "(".repeat(33) + "1" + ")".repeat(33),
    "1+".repeat(1000) + "1",
  ])("rejects %s", (expression) =>
    expect(() => calculate(expression)).toThrow(),
  );
});
it("returns a real instant with an explicit time zone and rejects invalid zones", () => {
  const now = new Date("2026-11-08T10:00:00Z");
  expect(currentDateTime("Europe/Vienna", now)).toMatchObject({
    iso: now.toISOString(),
    timeZone: "Europe/Vienna",
    unixMilliseconds: now.getTime(),
  });
  expect(currentDateTime("Europe/Vienna", now).local).toContain("11:00:00");
  expect(currentDateTime(undefined, now).timeZone).toBe("UTC");
  expect(() => currentDateTime("not-a-zone", now)).toThrow();
});
it("updates automatic activity labels but preserves manual labels, pinning and timestamps", () => {
  const doc = new Doc();
  upsertActivity(doc, { id: "chat", pinned: true });
  const before = doc.getMap("activities").get("chat");
  expect(setActivityLabel(doc, "chat", " New topic ", true)).toEqual({
    updated: true,
    label: "New topic",
  });
  expect(doc.getMap("activities").get("chat")).toMatchObject({
    ...(before as object),
    label: "New topic",
  });
  setActivityLabel(doc, "chat", "My title");
  expect(setActivityLabel(doc, "chat", "Another topic", true)).toEqual({
    updated: false,
    label: "My title",
  });
  expect(() => setActivityLabel(doc, "other", "Title", true)).toThrow(
    "NOT_FOUND",
  );
  doc.destroy();
});
const suggestionMessage: ChatMessage = {
  id: "assistant",
  role: "assistant",
  parts: [
    {
      type: "tool-chat-response-suggestions",
      toolCallId: "s",
      state: "output-available",
      input: { suggestions: ["Yes", "No"] },
      output: { ok: true, suggestions: ["Yes", "No"] },
    },
  ],
};
it("offers only successful suggestions from the latest assistant turn", () => {
  expect(getResponseSuggestions([suggestionMessage])).toEqual(["Yes", "No"]);
  expect(
    getResponseSuggestions([
      suggestionMessage,
      { id: "u", role: "user", parts: [{ type: "text", text: "No" }] },
    ]),
  ).toEqual([]);
  expect(
    getResponseSuggestions([
      suggestionMessage,
      {
        id: "a2",
        role: "assistant",
        parts: [{ type: "text", text: "Choose one" }],
      },
    ]),
  ).toEqual(["Yes", "No"]);
});

it("exposes the shared calculator and clock through authorized platform tools", async () => {
  const { createPlatformTools } =
    await import("../packages/realtime/src/platform/tools.ts");
  const tools = createPlatformTools({ claims: "admin", level: "user" } as any);
  const calculator = tools.find((tool) => tool.name === "platform_calculate")!;
  expect(calculator.level).toBe("user");
  expect(calculator.readOnly).toBe(true);
  expect(await calculator.execute({ expression: "sum(1;2;3)" })).toEqual({
    expression: "sum(1;2;3)",
    result: 6,
  });
  await expect(calculator.execute({ expression: "1/0" })).rejects.toThrow();
  expect(
    await tools
      .find((tool) => tool.name === "platform_current_date_time")!
      .execute({}),
  ).toMatchObject({ timeZone: "UTC" });
  const disabled = createPlatformTools({
    claims: "admin",
    level: "user",
    approvals: { user: "off", editor: "off", workspace: "off", admin: "off" },
  } as any);
  expect(disabled).toEqual([]);
});
