"use client";

// SEE: https://ui.shadcn.com/docs/components/base/bubble#show-more--collapsible

import {
  Bubble,
  BubbleContent,
} from "@schornio/aibox-package-ui/components/bubble";
import {
  Collapsible,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

const previewLength = 180;

export function ChatMessagePartUserText({ text }: { text?: string }) {
  const [open, setOpen] = useState(false);
  const isLong = (text?.length ?? 0) > previewLength;
  const preview = `${text?.substring(0, previewLength)}…`;

  return (
    <Bubble variant="muted">
      <BubbleContent className="whitespace-pre-wrap">
        <Collapsible open={open} onOpenChange={setOpen}>
          <div>{open || !isLong ? text : preview}</div>
          {isLong ? (
            <CollapsibleTrigger
              render={
                <Button
                  className="text-muted-foreground w-full"
                  size="xs"
                  variant="ghost"
                >
                  {open ? "Show less" : "Show more"}
                  <ChevronDownIcon
                    data-icon="inline-end"
                    className="group-data-panel-open/button:rotate-180"
                  />
                </Button>
              }
            />
          ) : undefined}
        </Collapsible>
      </BubbleContent>
    </Bubble>
  );
}
