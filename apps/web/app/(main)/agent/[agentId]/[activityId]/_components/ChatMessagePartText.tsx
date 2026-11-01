import type { ChatMessage } from "@schornio/aibox-package-database/chat/_types";
import { MarkdownProse } from "@schornio/aibox-package-ui/components/markdown-prose";

export function ChatMessagePartText({
  part,
}: {
  part: Extract<ChatMessage["parts"][number], { type: "text" }>;
}) {
  if (part.text.length === 0) {
    return undefined;
  }

  return <MarkdownProse className="max-w-full">{part.text}</MarkdownProse>;
}
