import type { ComponentProps, ReactNode } from "react";
import { Badge } from "@schornio/aibox-package-ui/components/badge";

const styles = {
  idle: {
    className:
      "bg-blue-500/10 text-blue-500 focus-visible:border-blue-500/40 focus-visible:ring-blue-500/20 dark:bg-blue-500/20 dark:focus-visible:ring-blue-500/40",
  },
  running: { variant: "outline" },
  success: {
    className:
      "bg-green-500/10 text-green-500 focus-visible:border-green-500/40 focus-visible:ring-green-500/20 dark:bg-green-500/20 dark:focus-visible:ring-green-500/40",
  },
  error: { variant: "destructive" },
  cancelled: { variant: "secondary" },
} satisfies Record<string, ComponentProps<typeof Badge>>;

export function StatusBadge({
  state,
  children,
  role,
}: {
  state: keyof typeof styles;
  children: ReactNode;
  role?: ComponentProps<typeof Badge>["role"];
}) {
  return (
    <Badge {...styles[state]} role={role}>
      {children}
    </Badge>
  );
}
