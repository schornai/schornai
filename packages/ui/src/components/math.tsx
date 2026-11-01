"use client";

import "katex/dist/katex.min.css";
import { useEffect, useRef } from "react";
import katex from "katex";

export function Math({ children }: { children?: string }) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!elementRef.current) {
      return;
    }

    try {
      katex.render(children ?? "", elementRef.current);
    } catch {
      elementRef.current.innerHTML = "";
    }
  }, [children]);

  return <span ref={elementRef} />;
}

export default Math;
