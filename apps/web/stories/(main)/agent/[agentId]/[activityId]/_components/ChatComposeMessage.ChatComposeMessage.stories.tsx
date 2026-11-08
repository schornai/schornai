import { ChatComposeFixtureProvider } from "../../../../../../.storybook/context-fixtures";
import { expect, userEvent, waitFor, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatComposeMessage } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatComposeMessage";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatComposeMessage",
  component: ChatComposeMessage,
  decorators: [
    (Story) => (
      <ChatComposeFixtureProvider>
        <Story />
      </ChatComposeFixtureProvider>
    ),
  ],
  args: { agentColor: { type: "color-oklch-hue", oklchHue: 284 } },
} satisfies Meta<typeof ChatComposeMessage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const AgentColor_color_oklch_hue_color_oklch_hue: Story = { args: {} };
export const AgentColor_color_rgb_color_rgb: Story = {
  args: {
    agentColor: {
      type: "color-rgb",
      blue: 200,
      green: 80,
      red: 100,
      opacity: 0.6,
    },
  },
};
export const AgentColor_missing: Story = { args: { agentColor: undefined } };
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const MessageQueued: Story = {
  parameters: {
    contextFixtures: {
      useChatComposeMessage: {
        selectedCurrentMessage: {
          id: "message-1",
          state: "queued",
          content: { type: "text", text: "Beispielnachricht", thinking: false },
        },
        messageBatch: [
          {
            id: "message-1",
            state: "queued",
            content: {
              type: "text",
              text: "Beispielnachricht",
              thinking: false,
            },
          },
        ],
      },
    },
  },
};
export const MessagePaused: Story = {
  parameters: {
    contextFixtures: {
      useChatComposeMessage: {
        selectedCurrentMessage: {
          id: "message-1",
          state: "paused",
          content: { type: "text", text: "Beispielnachricht", thinking: false },
        },
        messageBatch: [
          {
            id: "message-1",
            state: "paused",
            content: {
              type: "text",
              text: "Beispielnachricht",
              thinking: false,
            },
          },
        ],
      },
    },
  },
};
export const MessageSubmitted: Story = {
  parameters: {
    contextFixtures: {
      useChatComposeMessage: {
        selectedCurrentMessage: {
          id: "message-1",
          state: "submitted",
          content: { type: "text", text: "Beispielnachricht", thinking: false },
        },
        messageBatch: [
          {
            id: "message-1",
            state: "submitted",
            content: {
              type: "text",
              text: "Beispielnachricht",
              thinking: false,
            },
          },
        ],
      },
    },
  },
};
export const MessageClaimed: Story = {
  parameters: {
    contextFixtures: {
      useChatComposeMessage: {
        selectedCurrentMessage: {
          id: "message-1",
          state: "claimed",
          content: { type: "text", text: "Beispielnachricht", thinking: false },
        },
        messageBatch: [
          {
            id: "message-1",
            state: "claimed",
            content: {
              type: "text",
              text: "Beispielnachricht",
              thinking: false,
            },
          },
        ],
      },
    },
  },
};
export const MessageFinished: Story = {
  parameters: {
    contextFixtures: {
      useChatComposeMessage: {
        selectedCurrentMessage: {
          id: "message-1",
          state: "finished",
          content: { type: "text", text: "Beispielnachricht", thinking: false },
        },
        messageBatch: [
          {
            id: "message-1",
            state: "finished",
            content: {
              type: "text",
              text: "Beispielnachricht",
              thinking: false,
            },
          },
        ],
      },
    },
  },
};
export const NoSelectedMessage: Story = {
  parameters: {
    contextFixtures: {
      useChatComposeMessage: {
        selectedCurrentMessage: undefined,
        messageBatch: [],
      },
    },
  },
};
export const Thinking: Story = {
  parameters: {
    contextFixtures: {
      useChatComposeMessage: {
        defaultThinking: true,
        selectedCurrentMessage: {
          id: "message-1",
          state: "queued",
          content: { type: "text", text: "Beispielnachricht", thinking: true },
        },
      },
    },
  },
};
export const SubmittedApproval: Story = {
  parameters: {
    contextFixtures: { useChatComposeMessage: { approvalSubmitted: true } },
  },
};
export const RetryApproval: Story = {
  parameters: {
    scenario: "error",
    contextFixtures: { useChatComposeMessage: { approvalSubmitted: true } },
  },
};
export const ToolApproval: Story = {
  parameters: {
    contextFixtures: {
      useChatComposeMessage: {
        interaction: {
          type: "tool-approval",
          request: {
            approvalId: "approval-1",
            toolName: "storage-write-file",
            input: { path: "/example.md", content: "# Beispiel\n\nInhalt." },
          },
        },
      },
    },
  },
};

const recommendedMessages = [
  {
    id: "summary",
    label: "Zusammenfassen",
    message: "Fasse die wichtigsten Punkte zusammen.",
  },
  {
    id: "ideas",
    label: "Ideen sammeln",
    message: "Hilf mir, neue Ideen zu sammeln.",
  },
];

export const RecommendedMessages: Story = {
  args: { recommendedMessages },
  parameters: { contextFixtures: { useMessages: [] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.clear(canvas.getByRole("textbox"));
    await userEvent.type(
      canvas.getByRole("textbox"),
      "Mein bisheriger Entwurf",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: /Zusammenfassen/ }),
    );
    await waitFor(() =>
      expect(canvas.getByRole("textbox")).toHaveValue(
        recommendedMessages[0]!.message,
      ),
    );
    await expect(canvas.getByRole("textbox")).toHaveFocus();
    await userEvent.click(
      canvas.getByRole("button", { name: /Ideen sammeln/ }),
    );
    await waitFor(() =>
      expect(canvas.getByRole("textbox")).toHaveValue(
        recommendedMessages[1]!.message,
      ),
    );
    await expect(canvas.getByRole("textbox")).toHaveFocus();
  },
};

export const RecommendedMessageHash: Story = {
  args: { recommendedMessages },
  parameters: { contextFixtures: { useMessages: [] } },
  beforeEach: () => {
    const originalUrl = window.location.href;
    window.history.replaceState(
      window.history.state,
      "",
      "#recommendedMessage=summary",
    );
    return () =>
      window.history.replaceState(window.history.state, "", originalUrl);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByRole("textbox")).toHaveValue(
        recommendedMessages[0]!.message,
      ),
    );
    await expect(canvas.getByRole("textbox")).toHaveFocus();
    await expect(window.location.hash).toBe("");
    window.history.replaceState(
      window.history.state,
      "",
      "#recommendedMessage=ideas",
    );
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    await waitFor(() =>
      expect(canvas.getByRole("textbox")).toHaveValue(
        recommendedMessages[1]!.message,
      ),
    );
    await expect(canvas.getByRole("textbox")).toHaveFocus();
    await expect(window.location.hash).toBe("");
  },
};

export const ResponseSuggestions: Story = {
  parameters: {
    contextFixtures: {
      useMessages: [
        {
          id: "assistant-suggestions",
          role: "assistant",
          parts: [
            {
              type: "tool-chat-response-suggestions",
              toolCallId: "suggestions",
              state: "output-available",
              input: {
                suggestions: [
                  "Bitte ein Beispiel",
                  "Weiter mit dem nächsten Schritt",
                ],
              },
              output: {
                ok: true,
                suggestions: [
                  "Bitte ein Beispiel",
                  "Weiter mit dem nächsten Schritt",
                ],
              },
            },
          ],
        },
      ],
    },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.clear(canvas.getByRole("textbox"));
    await userEvent.type(canvas.getByRole("textbox"), "Mein Entwurf");
    await userEvent.click(
      canvas.getByRole("button", { name: "Bitte ein Beispiel" }),
    );
    await waitFor(() =>
      expect(canvas.getByRole("textbox")).toHaveValue(
        "Mein Entwurf\nBitte ein Beispiel",
      ),
    );
    await expect(canvas.getByRole("textbox")).toHaveFocus();
  },
};
