import { ChatMessagePartToolMCP } from "./ChatMessagePartToolMCP";
import { ChatMessagePartToolStorageTransferFile } from "./ChatMessagePartToolStorageTransferFile";
import { Copy, FolderInput, Globe, Plug, Search } from "lucide-react";
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
  switch (partType) {
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
  switch (part.type) {
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
