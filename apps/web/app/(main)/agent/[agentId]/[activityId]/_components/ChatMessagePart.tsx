import { ChatMessagePartToolSupport } from "./ChatMessagePartToolSupport";
import { ChatMessagePartContextCompression } from "./ChatMessagePartContextCompression";
import {
  ChatMessagePartToolPlatform,
  isPlatformToolPart,
} from "./ChatMessagePartToolPlatform";
import { ChatMessagePartToolMCP } from "./ChatMessagePartToolMCP";
import { ChatMessagePartToolStorageTransferFile } from "./ChatMessagePartToolStorageTransferFile";
import {
  Calculator,
  Clock,
  Tag,
  MessageSquareQuote,
  Copy,
  DraftingCompass,
  FolderInput,
  Globe,
  Plug,
  Search,
  Summary,
} from "lucide-react";
import { ChatMessagePartToolWebFetch } from "./ChatMessagePartToolWebFetch";
import { ChatMessagePartToolWebSearch } from "./ChatMessagePartToolWebSearch";
import {
  ChatMessagePartReasoning,
  ChatMessagePartReasoningIcon,
} from "./ChatMessagePartReasoning";
import {
  ChatMessagePartToolStorageList,
  ChatMessagePartToolStorageListIcon,
} from "./ChatMessagePartToolStorageList";
import {
  ChatMessagePartToolStorageReadFile,
  ChatMessagePartToolStorageReadFileIcon,
} from "./ChatMessagePartToolStorageReadFile";
import {
  ChatMessagePartToolStorageSearch,
  ChatMessagePartToolStorageSearchIcon,
} from "./ChatMessagePartToolStorageSearch";
import {
  ChatMessagePartToolStorageWriteFile,
  ChatMessagePartToolStorageWriteFileIcon,
} from "./ChatMessagePartToolStorageWriteFile";
import {
  ChatMessagePartUnknown,
  ChatMessagePartUnknownIcon,
} from "./ChatMessagePartUnknown";
import type { AppColor } from "@schornio/aibox-package-database/_shared/_types";
import type { ChatMessage } from "@schornio/aibox-package-database/chat/_types";
import { ChatMessagePartText } from "./ChatMessagePartText";

export function ChatMessagePartIcon({
  partType,
}: {
  partType: ChatMessage["parts"][number]["type"];
}) {
  if (partType.startsWith("tool-platform_")) return <DraftingCompass />;
  switch (partType) {
    case "data-contextCompression":
      return <Summary />;
    case "tool-calculator":
      return <Calculator />;
    case "tool-chat-set-label":
      return <Tag />;
    case "tool-chat-current-date-time":
      return <Clock />;
    case "tool-chat-response-suggestions":
      return <MessageSquareQuote />;
    case "tool-mcp":
      return <Plug />;
    case "tool-storage-copy-file":
      return <Copy />;
    case "tool-storage-move-file":
      return <FolderInput />;
    case "tool-web-fetch":
      return <Globe />;
    case "tool-web-search":
      return <Search />;
    case "reasoning":
      return <ChatMessagePartReasoningIcon />;
    case "tool-storage-list":
      return <ChatMessagePartToolStorageListIcon />;
    case "tool-storage-read-file":
      return <ChatMessagePartToolStorageReadFileIcon />;
    case "tool-storage-write-file":
      return <ChatMessagePartToolStorageWriteFileIcon />;
    case "tool-storage-search":
      return <ChatMessagePartToolStorageSearchIcon />;
    default:
      return <ChatMessagePartUnknownIcon />;
  }
}

export function ChatMessagePart({
  agentColor,
  part,
}: {
  agentColor?: AppColor;
  part: ChatMessage["parts"][number];
}) {
  if (isPlatformToolPart(part))
    return <ChatMessagePartToolPlatform part={part} agentColor={agentColor} />;
  switch (part.type) {
    case "data-contextCompression":
      return <ChatMessagePartContextCompression part={part} />;
    case "tool-calculator":
    case "tool-chat-set-label":
    case "tool-chat-current-date-time":
    case "tool-chat-response-suggestions":
      return <ChatMessagePartToolSupport agentColor={agentColor} part={part} />;
    case "tool-mcp":
      return <ChatMessagePartToolMCP agentColor={agentColor} part={part} />;
    case "tool-storage-copy-file":
    case "tool-storage-move-file":
      return (
        <ChatMessagePartToolStorageTransferFile
          agentColor={agentColor}
          part={part}
        />
      );
    case "tool-web-fetch":
      return (
        <ChatMessagePartToolWebFetch agentColor={agentColor} part={part} />
      );
    case "tool-web-search":
      return (
        <ChatMessagePartToolWebSearch agentColor={agentColor} part={part} />
      );
    case "reasoning":
      return <ChatMessagePartReasoning agentColor={agentColor} part={part} />;
    case "text":
      return <ChatMessagePartText part={part} />;
    case "tool-storage-list":
      return (
        <ChatMessagePartToolStorageList agentColor={agentColor} part={part} />
      );
    case "tool-storage-read-file":
      return (
        <ChatMessagePartToolStorageReadFile
          agentColor={agentColor}
          part={part}
        />
      );
    case "tool-storage-write-file":
      return (
        <ChatMessagePartToolStorageWriteFile
          agentColor={agentColor}
          part={part}
        />
      );
    case "tool-storage-search":
      return (
        <ChatMessagePartToolStorageSearch agentColor={agentColor} part={part} />
      );
    default:
      return <ChatMessagePartUnknown agentColor={agentColor} part={part} />;
  }
}
