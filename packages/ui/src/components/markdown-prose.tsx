import { ComponentProps } from "react";
import { Markdown } from "./markdown.tsx";
import { cn } from "@schornio/aibox-package-ui/lib/utils";

export function MarkdownProse({
  className,
  ...markdownProps
}: ComponentProps<typeof Markdown> & { className?: string }) {
  return (
    <div className={cn("prose dark:prose-invert [&_li>p]:m-0", className)}>
      <Markdown {...markdownProps} />
    </div>
  );
}
