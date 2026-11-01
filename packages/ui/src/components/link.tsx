"use client";

import { useEffect, useState } from "react";
import type { ComponentProps } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@schornio/aibox-package-ui/lib/utils";

export function Link({
  children,
  className,
  href,
  ...props
}: ComponentProps<"a">) {
  const [isSameHost, setIsSameHost] = useState(false);

  useEffect(() => {
    if (href) {
      const url = new URL(href, window.location.href);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSameHost(url.host === window.location.host);
    }
  }, [href]);

  return (
    <a {...props} className={cn("underline", className)} href={href}>
      {isSameHost ? (
        children
      ) : (
        <>
          {children}
          <ExternalLink className="inline" size={14} />
        </>
      )}
    </a>
  );
}
