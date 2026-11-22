import type { ReactNode } from "react";

export function EditorHeaderTitle({
  icon,
  title,
  name,
  children,
}: {
  icon: ReactNode;
  title: string;
  name?: string;
  children?: ReactNode;
}) {
  return (
    <h1 className="mx-auto flex max-w-full min-w-0 items-center gap-2 text-center text-lg font-bold [&>button]:shrink-0 [&>svg]:shrink-0">
      {icon}
      <span className="flex min-w-0 flex-col">
        <span className="truncate">{title}</span>
        <span className="truncate text-xs">{name}</span>
      </span>
      {children}
    </h1>
  );
}
