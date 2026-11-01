import type { ComponentProps } from "react";
import { cn } from "@schornio/aibox-package-ui/lib/utils";

export function Header({ className, ...otherProps }: ComponentProps<"h2">) {
  return <h2 {...otherProps} className={cn("text-xl font-bold", className)} />;
}
