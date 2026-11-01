import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { openDisclosure } from "../../../../../../.storybook/interaction-helpers";
import { ChatMessagePartToolWebFetch } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartToolWebFetch";

import {
  ChatMessagePartToolWebLayout,
  WebSourceLink,
} from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartToolWebLayout";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatMessagePartToolWebFetch",
  component: ChatMessagePartToolWebFetch,
  subcomponents: { ChatMessagePartToolWebLayout, WebSourceLink },
  args: {
    part: {
      type: "tool-web-fetch",
      toolCallId: "fetch",
      state: "output-available",
      input: { url: "https://example.com" },
      output: {
        ok: true,
        title: "Example page",
        url: "https://example.com",
        content:
          "This is the fetched page content.\n\nThe agent can use it as a source.",
        contentOffset: 0,
        totalLength: 30000,
        truncated: true,
      },
    },
  },
} satisfies Meta<typeof ChatMessagePartToolWebFetch>;
export default meta;
type Story = StoryObj<typeof meta>;
export const LegacyFetch: Story = { play: openDisclosure };
export const Fetch: Story = {
  args: {
    part: {
      type: "tool-web-fetch",
      toolCallId: "fetch",
      state: "output-available",
      input: { url: "https://example.com/report.pdf" },
      output: {
        ok: true,
        url: "https://example.com/report.pdf",
        path: "/this_conversation/web/example.com/report.pdf",
        storagePath: "web/example.com/report.pdf",
        processing: "ready",
        content:
          "Report summary\n\nThis is the extracted document text, available directly in the fetch result.",
        storage: { type: "activity", agentId: "agent", activityId: "chat" },
        file: {
          file: true,
          name: "report.pdf",
          path: "/this_conversation/web/example.com/report.pdf",
          type: "application/pdf",
          size: 2048,
          createdAtISO: "2026-10-11T12:00:00Z",
          updatedAtISO: "2026-10-11T12:00:00Z",
        },
      },
    },
  },
  play: openDisclosure,
};
export const Pending: Story = {
  args: {
    part: {
      type: "tool-web-fetch",
      toolCallId: "fetch",
      state: "input-streaming",
      input: { url: "https://example.com" },
    },
  },
  play: openDisclosure,
};
export const Error: Story = {
  args: {
    part: {
      type: "tool-web-fetch",
      toolCallId: "fetch",
      state: "output-available",
      input: { url: "https://example.com" },
      output: {
        ok: false,
        error: "This URL is not allowed by the role's web fetch configuration.",
      },
    },
  },
  play: openDisclosure,
};
export const Denied: Story = {
  args: {
    part: {
      type: "tool-web-fetch",
      toolCallId: "fetch",
      state: "output-denied",
      input: { url: "https://example.com" },
      approval: { id: "approval", approved: false },
    },
  },
  play: openDisclosure,
};

export const FetchProcessingFailed: Story = {
  args: {
    part: {
      ...Fetch.args!.part!,
      output: {
        ...Fetch.args!.part!.output!,
        processing: "failed",
        content: undefined,
      },
    } as NonNullable<Story["args"]>["part"],
  },
  play: openDisclosure,
};
export const FetchProcessingUnavailable: Story = {
  args: {
    part: {
      ...Fetch.args!.part!,
      output: {
        ...Fetch.args!.part!.output!,
        processing: "unavailable",
        content: undefined,
      },
    } as NonNullable<Story["args"]>["part"],
  },
  play: openDisclosure,
};
