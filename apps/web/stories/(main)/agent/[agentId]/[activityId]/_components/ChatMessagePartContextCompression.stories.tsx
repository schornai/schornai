import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, waitFor } from "storybook/test";
import type { ChatMessage as Message } from "@schornio/aibox-package-database/chat/_types";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ChatMessagePartContextCompression } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartContextCompression";
import { ChatMessage } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatMessage";
import {
  contextCompressionQuestion,
  runContextCompressionDemo,
} from "../../../../../../.storybook/context-compression-fixtures";

const meta = {
  title:
    "Web/(main)/agent/[agentId]/[activityId]/ChatMessagePartContextCompression",
  component: ChatMessagePartContextCompression,
  args: {
    part: {
      type: "data-contextCompression",
      id: "compression",
      data: { state: "completed" },
    },
  },
} satisfies Meta<typeof ChatMessagePartContextCompression>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Completed: Story = {};
export const Pending: Story = {
  args: {
    part: { type: "data-contextCompression", data: { state: "pending" } },
  },
};
export const Failed: Story = {
  args: {
    part: { type: "data-contextCompression", data: { state: "failed" } },
  },
};
export const Interrupted: Story = {
  args: {
    part: { type: "data-contextCompression", data: { state: "interrupted" } },
  },
};

function CompressionDemo() {
  const [message, setMessage] = useState<Message>();
  const [running, setRunning] = useState(false);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <p className="text-muted-foreground text-sm">
        Komprimierungstest · 4.096 Tokens · simuliertes Modell
      </p>
      <ChatMessage message={contextCompressionQuestion} />
      {message && <ChatMessage message={message} />}
      <Button
        disabled={running}
        onClick={async () => {
          setRunning(true);
          setMessage(undefined);
          try {
            await runContextCompressionDemo(setMessage);
          } finally {
            setRunning(false);
          }
        }}
      >
        Test starten
      </Button>
    </div>
  );
}
export const LiveCompression: Story = {
  render: () => <CompressionDemo />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Test starten" }));
    await expect(
      await canvas.findByText("Kontext wird zusammengefasst …"),
    ).toBeVisible();
    await expect(
      canvas.getByText(
        "Bitte fahre mit unserem Plan fort. Behalte die bisherigen Entscheidungen bei.",
      ),
    ).toBeVisible();
    await waitFor(
      () => expect(canvas.getByText("Kontext zusammengefasst")).toBeVisible(),
      { timeout: 10000 },
    );
    await expect(
      canvas.queryByText("Kontext wird zusammengefasst …"),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getByText(/Ich fahre mit dem vereinbarten Plan fort/),
    ).toBeVisible();
  },
};
