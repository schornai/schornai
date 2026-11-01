import type { ComponentProps } from "react";
import { cn } from "@schornio/aibox-package-ui/lib/utils";

export function ContainerMain({
  children,
  className,
  size,
  ...otherProps
}: { size?: "narrow" } & ComponentProps<"div">) {
  return (
    <div
      {...otherProps}
      className={cn(
        "mx-auto w-full max-w-6xl p-3",
        {
          "max-w-2xl": size === "narrow",
        },
        className,
      )}
    >
      {children}
    </div>
  );
}
