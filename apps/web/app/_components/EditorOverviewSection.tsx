import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useId } from "react";

export function EditorOverviewSection({
  view,
  icon: Icon,
  title,
  description,
  children,
}: {
  view: string;
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="@container min-w-0 rounded-lg border"
    >
      <div className="grid @2xl:grid-cols-[20rem_minmax(0,1fr)]">
        <Link
          href={`?view=${view}`}
          aria-labelledby={titleId}
          className="focus-visible:ring-ring hover:bg-muted/60 flex min-w-0 cursor-pointer flex-col gap-2 rounded-t-lg p-4 text-start no-underline! transition-colors only:col-span-full only:rounded-lg focus-visible:ring-2 focus-visible:outline-none @2xl:rounded-s-lg @2xl:rounded-e-none"
        >
          <h2
            id={titleId}
            className="flex items-center gap-2 text-base font-semibold"
          >
            <Icon aria-hidden="true" className="size-5 shrink-0" />
            <span className="truncate">{title}</span>
          </h2>
          {description && (
            <div className="text-muted-foreground flex flex-col gap-2 text-sm">
              {description}
            </div>
          )}
        </Link>
        {children && (
          <div className="flex min-w-0 flex-col gap-1 p-3 empty:hidden">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
