import type { ReactNode } from "react";
import { cn } from "@schornio/aibox-package-ui/lib/utils";

export function ContainerTable({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return <div className={cn("rounded-md border", className)}>{children}</div>;
}
