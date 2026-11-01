import type { ReactNode } from "react";

export function InfoActions({ children }: { children?: ReactNode }) {
  return <div className="flex h-1 gap-1">{children}</div>;
}
