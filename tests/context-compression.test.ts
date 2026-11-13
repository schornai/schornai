import { describe, expect, it, vi } from "vitest";
import {
  estimateContextTokens,
  withContextCompression,
} from "../packages/realtime/src/models/withContextCompression";
import type {
  LanguageModelV4,
  LanguageModelV4DoGenerateParameters as Options,
} from "../packages/realtime/src/documents/modelDoStream/_types";
const user = (text: string): Options["prompt"][number] => ({
  role: "user",
  content: [{ type: "text", text }],
});
const assistant = (text: string): Options["prompt"][number] => ({
  role: "assistant",
  content: [{ type: "text", text }],
});
function setup(size: number | undefined = 4096) {
  const doGenerate = vi.fn().mockResolvedValue({
    content: [{ type: "text", text: "Preserved goals and decisions." }],
  });
  const doStream = vi.fn().mockResolvedValue({ stream: new ReadableStream() });
  const base = {
    specificationVersion: "v4",
    provider: "test",
    modelId: "test",
    supportedUrls: {},
    doGenerate,
    doStream,
  } as unknown as LanguageModelV4;
  return {
    model: withContextCompression(base, async () => size),
    doGenerate,
    doStream,
  };
}
describe("context compression at the provider boundary", () => {
  it("leaves an unknown-limit model entirely unchanged", async () => {
    const { model, doGenerate } = setup(0);
    const options = { prompt: [user("x".repeat(50000))] };
    await model.doGenerate(options);
    expect(doGenerate).toHaveBeenCalledExactlyOnceWith(options);
  });
  it("reserves output space and leaves small prompts unchanged", async () => {
    const { model, doStream, doGenerate } = setup();
    const prompt = [user("Hello")];
    await model.doStream({ prompt });
    expect(doGenerate).not.toHaveBeenCalled();
    expect(doStream).toHaveBeenCalledWith(
      expect.objectContaining({ prompt, maxOutputTokens: 1024 }),
    );
  });
  it("compresses oversized history without mutating it, retains instructions and latest input", async () => {
    const { model, doGenerate, doStream } = setup();
    const prompt: Options["prompt"] = [
      { role: "system", content: "Follow policy" },
      user("Old facts ".repeat(2000)),
      assistant("Completed"),
      user("What next?"),
    ];
    const original = structuredClone(prompt);
    await model.doStream({ prompt });
    const sent = doStream.mock.calls[0]![0] as Options;
    expect(sent.prompt[0]).toEqual(prompt[0]);
    expect(sent.prompt.at(-1)).toEqual(user("What next?"));
    expect(JSON.stringify(sent.prompt)).toContain("Preserved goals");
    expect(estimateContextTokens(sent.prompt)).toBeLessThan(2400);
    expect(prompt).toEqual(original);
    expect(doGenerate.mock.calls.length).toBeGreaterThan(1);
    for (const [request] of doGenerate.mock.calls) {
      expect(
        estimateContextTokens(request.prompt) + request.maxOutputTokens,
      ).toBeLessThan(4096);
      expect(request.tools).toBeUndefined();
    }
    const calls = doGenerate.mock.calls.length;
    await model.doStream({ prompt });
    expect(doGenerate).toHaveBeenCalledTimes(calls);
  });
  it("keeps unresolved tool calls and approval responses verbatim", async () => {
    const { model, doStream } = setup();
    const pending: Options["prompt"] = [
      user("Execute only after approval"),
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "pending",
            toolName: "write",
            input: "{}",
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-approval-response",
            approvalId: "approval",
            approved: true,
          },
        ],
      },
    ];
    await model.doStream({
      prompt: [user("old ".repeat(4000)), assistant("done"), ...pending],
    });
    expect(doStream.mock.calls[0]![0].prompt.slice(-3)).toEqual(pending);
  });
  it("compresses completed tool cycles during a single user turn", async () => {
    const { model, doStream } = setup();
    await model.doStream({
      prompt: [
        user("Research"),
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "one",
              toolName: "read",
              input: "{}",
            },
          ],
        },
        {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: "one",
              toolName: "read",
              output: { type: "text", value: "result ".repeat(3000) },
            },
          ],
        },
        assistant("Continue research"),
      ],
    });
    const prompt = doStream.mock.calls[0]![0].prompt;
    expect(prompt.at(-2)).toEqual(user("Research"));
    expect(prompt.at(-1)).toEqual(assistant("Continue research"));
    expect(JSON.stringify(prompt)).not.toContain('"toolCallId"');
  });
  it("fails without sending an oversized current input or tool schema", async () => {
    const { model, doStream, doGenerate } = setup();
    await expect(
      model.doStream({ prompt: [user("x".repeat(20000))] }),
    ).rejects.toThrow("CONTEXT_BUDGET_EXCEEDED");
    await expect(
      model.doStream({
        prompt: [user("hi")],
        tools: [
          {
            type: "function",
            name: "big",
            description: "x".repeat(20000),
            inputSchema: {},
          },
        ],
      }),
    ).rejects.toThrow("CONTEXT_BUDGET_EXCEEDED");
    expect(doStream).not.toHaveBeenCalled();
    expect(doGenerate).not.toHaveBeenCalled();
  });
  it("propagates cancellation before summarization and rejects empty summaries", async () => {
    const { model, doGenerate, doStream } = setup();
    const prompt = [user("x".repeat(20000)), assistant("done"), user("next")];
    await expect(
      model.doStream({ prompt, abortSignal: AbortSignal.abort() }),
    ).rejects.toThrow();
    expect(doGenerate).not.toHaveBeenCalled();
    doGenerate.mockResolvedValue({ content: [] });
    await expect(model.doStream({ prompt })).rejects.toThrow(
      "CONTEXT_COMPRESSION_FAILED",
    );
    expect(doStream).not.toHaveBeenCalled();
  });
  it("counts non-ASCII content and tool JSON", () => {
    expect(estimateContextTokens("漢字".repeat(100))).toBeGreaterThan(
      estimateContextTokens("ab".repeat(100)),
    );
    expect(estimateContextTokens({ tool: "x".repeat(1000) })).toBeGreaterThan(
      500,
    );
  });
});

it("compresses a final completed tool result while preserving the user request", async () => {
  const { model, doStream } = setup();
  await model.doStream({
    prompt: [
      user("Research"),
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "one",
            toolName: "read",
            input: "{}",
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "one",
            toolName: "read",
            output: { type: "text", value: "result ".repeat(3000) },
          },
        ],
      },
    ],
  });
  const sent = doStream.mock.calls[0]![0].prompt;
  expect(sent.at(-1)).toEqual(user("Research"));
  expect(JSON.stringify(sent)).toContain("Preserved goals");
  expect(JSON.stringify(sent)).not.toContain("toolCallId");
});
it("estimates attachment overhead and summarizes references without binary dumps", async () => {
  const { model, doGenerate } = setup();
  const file = {
    type: "file" as const,
    mediaType: "image/png",
    data: new Uint8Array(10000),
  };
  expect(estimateContextTokens(file)).toBeGreaterThan(9000);
  expect(
    estimateContextTokens({
      ...file,
      data: new URL("https://example.com/image.png"),
    }),
  ).toBeGreaterThan(16000);
  await model.doGenerate({
    prompt: [
      { role: "user", content: [file] },
      assistant("Image reviewed"),
      user("Continue"),
    ],
    maxOutputTokens: 500,
  });
  expect(JSON.stringify(doGenerate.mock.calls[0]![0].prompt)).toContain(
    "Attachment content omitted",
  );
  expect(doGenerate.mock.lastCall![0].maxOutputTokens).toBe(500);
});
it("stops on a summary provider failure without forwarding the original oversized prompt", async () => {
  const { model, doGenerate, doStream } = setup();
  doGenerate.mockRejectedValue(new Error("summary unavailable"));
  await expect(
    model.doStream({
      prompt: [user("old ".repeat(4000)), assistant("done"), user("next")],
    }),
  ).rejects.toThrow("summary unavailable");
  expect(doStream).not.toHaveBeenCalled();
});
it("preserves text in tool JSON data fields during summarization", async () => {
  const { model, doGenerate } = setup();
  await model.doGenerate({
    prompt: [
      user("Research"),
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "one",
            toolName: "read",
            input: "{}",
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "one",
            toolName: "read",
            output: {
              type: "json",
              value: { data: "Important evidence. ".repeat(1000) },
            },
          },
        ],
      },
    ],
  });
  expect(JSON.stringify(doGenerate.mock.calls)).toContain(
    "Important evidence.",
  );
  expect(JSON.stringify(doGenerate.mock.calls)).not.toContain(
    "Attachment content omitted",
  );
});

it("uses the actual request budget for chunks and does not reject a fitting summary by character length", async () => {
  const { model, doGenerate, doStream } = setup();
  const summary = "A sufficiently detailed preserved decision. ".repeat(30);
  doGenerate.mockResolvedValue({
    content: [{ type: "text", text: summary }],
    finishReason: { unified: "stop" },
  });
  await model.doStream({
    prompt: [
      user("Older project facts. ".repeat(500)),
      assistant("done"),
      user("next"),
    ],
  });
  expect(doStream).toHaveBeenCalledOnce();
  expect(doGenerate.mock.calls.length).toBeLessThan(8);
  for (const [request] of doGenerate.mock.calls) {
    expect(request.maxOutputTokens).toBe(1024);
    expect(
      estimateContextTokens(request.prompt) + request.maxOutputTokens,
    ).toBeLessThanOrEqual(4096 * 0.85);
  }
  expect(JSON.stringify(doStream.mock.calls[0]![0].prompt)).toContain(summary);
});

it("leaves room for reasoning tokens instead of capping generation at the summary target", async () => {
  const { model, doGenerate, doStream } = setup();
  doGenerate.mockImplementation(async ({ maxOutputTokens }) => ({
    content:
      maxOutputTokens > 256
        ? [{ type: "text", text: "Project Bluebird, budget 5000 EUR." }]
        : [],
    finishReason: { unified: maxOutputTokens > 256 ? "stop" : "length" },
  }));
  await model.doStream({
    prompt: [user("Old facts ".repeat(700)), assistant("done"), user("next")],
  });
  expect(doStream).toHaveBeenCalledOnce();
});

it("does not continue with a truncated summary", async () => {
  const { model, doGenerate, doStream } = setup();
  doGenerate.mockResolvedValue({
    content: [{ type: "text", text: "Partial summary" }],
    finishReason: { unified: "length" },
  });
  await expect(
    model.doStream({
      prompt: [user("Old facts ".repeat(700)), assistant("done"), user("next")],
    }),
  ).rejects.toThrow("CONTEXT_COMPRESSION_FAILED");
  expect(doStream).not.toHaveBeenCalled();
});
