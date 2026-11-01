import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@schornio/aibox-package-ui/components/message-scroller";
import type { ReactNode } from "react";

export function ContainerChat({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex-1">
      <div className="absolute inset-0">
        <MessageScrollerProvider autoScroll={true}>
          <MessageScroller>
            <MessageScrollerViewport className="scroll-fade-none">
              {children}
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      </div>
    </div>
  );
}
