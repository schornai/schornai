import { AlertTitle } from "@schornio/aibox-package-ui/components/alert";
import type { ReactNode } from "react";

export function InfoTitle({ children }: { children?: ReactNode }) {
  return <AlertTitle className="flex gap-1">{children}</AlertTitle>;
}
