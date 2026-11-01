import type { ComponentProps } from "react";
import { cn } from "@schornio/aibox-package-ui/lib/utils";

export function StorageObjectTileContainer({
  className,
  view,
  ...props
}: { view: string } & ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "grid justify-center gap-3 p-3",
        {
          "grid-cols-[repeat(auto-fill,120px)]": view === "tiles-medium",
          "grid-cols-[repeat(auto-fill,208px)]": view === "tiles-large",
          "grid-cols-[repeat(auto-fill,288px)]": view === "tiles-small",
        },
        className,
      )}
    />
  );
}
