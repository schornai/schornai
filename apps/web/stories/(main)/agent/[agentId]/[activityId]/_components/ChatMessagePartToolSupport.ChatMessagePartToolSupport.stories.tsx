import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { openDisclosure } from "../../../../../../.storybook/interaction-helpers";
import { ChatMessagePartToolSupport } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartToolSupport";
const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatMessagePartToolSupport",
  component: ChatMessagePartToolSupport,
} satisfies Meta<typeof ChatMessagePartToolSupport>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Calculator: Story = {
  args: {
    part: {
      type: "tool-calculator",
      toolCallId: "calc",
      state: "output-available",
      input: { expression: "23 * 32 + 1" },
      output: { ok: true, expression: "23 * 32 + 1", result: 737 },
    },
  },
  play: openDisclosure,
};
export const InvalidExpression: Story = {
  args: {
    part: {
      type: "tool-calculator",
      toolCallId: "calc",
      state: "output-available",
      input: { expression: "1 / 0" },
      output: { ok: false, error: "The result must be a finite real number." },
    },
  },
  play: openDisclosure,
};
export const Pending: Story = {
  args: {
    part: {
      type: "tool-calculator",
      toolCallId: "calc",
      state: "input-streaming",
      input: { expression: "sqrt(" },
    },
  },
  play: openDisclosure,
};
export const Label: Story = {
  args: {
    part: {
      type: "tool-chat-set-label",
      toolCallId: "label",
      state: "output-available",
      input: { label: "Projektplanung" },
      output: { ok: true, label: "Projektplanung", updated: true },
    },
  },
  play: openDisclosure,
};
export const ManualLabel: Story = {
  args: {
    part: {
      type: "tool-chat-set-label",
      toolCallId: "label",
      state: "output-available",
      input: { label: "Projektplanung" },
      output: { ok: true, label: "Mein eigener Titel", updated: false },
    },
  },
  play: openDisclosure,
};
export const Time: Story = {
  args: {
    part: {
      type: "tool-chat-current-date-time",
      toolCallId: "time",
      state: "output-available",
      input: { timeZone: "Europe/Vienna" },
      output: {
        ok: true,
        iso: "2026-11-08T10:00:00.000Z",
        timeZone: "Europe/Vienna",
        local: "Sunday, 8 November 2026 at 11:00:00 CET",
        unixMilliseconds: 1794132000000,
      },
    },
  },
  play: openDisclosure,
};
export const Suggestions: Story = {
  args: {
    part: {
      type: "tool-chat-response-suggestions",
      toolCallId: "suggestions",
      state: "output-available",
      input: {
        suggestions: ["Bitte ein Beispiel", "Weiter mit dem nächsten Schritt"],
      },
      output: {
        ok: true,
        suggestions: ["Bitte ein Beispiel", "Weiter mit dem nächsten Schritt"],
      },
    },
  },
  play: openDisclosure,
};
