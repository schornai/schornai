"use client";

import { Search } from "lucide-react";
import { useT } from "next-i18next/client";
import type { AppColor } from "@schornio/aibox-package-database/_shared/_types";
import type { ChatMessage } from "@schornio/aibox-package-database/chat/_types";
import {
  ChatMessagePartToolWebLayout,
  WebSourceLink,
} from "./ChatMessagePartToolWebLayout";

export function ChatMessagePartToolWebSearch({
  agentColor,
  part,
}: {
  agentColor?: AppColor;
  part: Extract<ChatMessage["parts"][number], { type: "tool-web-search" }>;
}) {
  const { t } = useT("agent", {
    keyPrefix: "_components.ChatMessagePartToolWebSearch",
  });
  const output = part.output?.ok ? part.output : undefined;
  return (
    <ChatMessagePartToolWebLayout
      agentColor={agentColor}
      part={part}
      icon={<Search />}
      title={t("labelSearch")}
      inputLabel={t("labelQuery")}
      inputValue={part.input?.query}
    >
      {output && (
        <>
          <p className="text-muted-foreground">
            {output.provider === "brave" ? "Brave" : "Staan"}
          </p>
          {output.results.length === 0 ? (
            <p>{t("labelEmptyResults")}</p>
          ) : (
            <ol className="flex list-decimal flex-col gap-3 pl-5">
              {output.results.map((result, index) => (
                <li className="pl-1" key={`${result.url}-${index}`}>
                  <WebSourceLink url={result.url}>
                    {result.title || result.url}
                  </WebSourceLink>
                  <p className="text-muted-foreground break-words">
                    {result.url}
                  </p>
                  <p>{result.snippet}</p>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </ChatMessagePartToolWebLayout>
  );
}
