import type { ReactNode } from "react";

export function ChatToolApprovalContent({
  children,
  description,
  icon,
  title,
}: {
  children?: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3">
      <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
        {icon}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
        {children}
      </div>
    </div>
  );
}
