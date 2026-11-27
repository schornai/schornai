import type { ReactNode } from "react";

export function ResourceInfoLayout({
  card,
  actions,
  children,
}: {
  card: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[auto_minmax(0,1fr)]">
      <div className="mx-auto flex w-80 max-w-full flex-col gap-2">
        {card}
        {actions}
      </div>
      <div className="flex min-w-0 flex-col gap-1">{children}</div>
    </div>
  );
}
