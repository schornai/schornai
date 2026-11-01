import type { ReactNode } from "react";

export function TranscriberListCardsContainer({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="mx-auto grid w-fit grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
      {children}
    </div>
  );
}
