import { AvatarApp } from "@schornio/aibox-package-ui/components/avatar-app";
import type { ComponentProps } from "react";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { mergeProps, useRender } from "@base-ui/react";

export function CardApp({
  className,
  ...props
}: ComponentProps<typeof ContainerStyled>) {
  return (
    <ContainerStyled
      className={cn(
        "flex aspect-video w-80 flex-col rounded-xl p-1",
        className,
      )}
      variant="card"
      {...props}
    />
  );
}

export function CardAppMain({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  const element = useRender({
    defaultTagName: "div",
    render,
    props: mergeProps<"div">(
      {
        className: cn("flex flex-1 items-center text-left", className),
      },
      props,
    ),
  });
  return element;
}

export function CardAppContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex-1", className)} {...props} />;
}

export function CardAppHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "text-muted-foreground mx-auto mt-1 flex gap-1 text-xs [&_>_svg]:size-4",
        className,
      )}
    />
  );
}

export function CardAppAvatar({
  className,
  ...props
}: ComponentProps<typeof AvatarApp>) {
  return <AvatarApp className={cn("m-3", className)} size="lg" {...props} />;
}

export function CardAppName({ className, ...props }: ComponentProps<"h2">) {
  return <h2 className={cn("text-md font-semibold", className)} {...props} />;
}

export function CardAppDescription({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div className={cn("text-xs", className)} {...props} />;
}

export function CardAppFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex justify-between", className)} {...props} />;
}

// export function CardAppFooterGroup({
//   className,
//   ...props
// }: ComponentProps<"div">) {
//   return <div className={cn("flex", className)} {...props} />;
// }

// export function CardAppFooterIconInfo({
//   className,
//   tooltip,
//   ...props
// }: { tooltip: string } & ComponentProps<typeof TooltipTrigger>) {
//   return (
//     <Tooltip>
//       <TooltipTrigger
//         className={cn(
//           "text-muted-foreground m-1.5 size-4 cursor-help",
//           className,
//         )}
//         {...props}
//       />
//       <TooltipContent>{tooltip}</TooltipContent>
//     </Tooltip>
//   );
// }

// export function CardAppButtonAction({
//   tooltip,
//   ...props
// }: { tooltip: string } & ComponentProps<typeof Button>) {
//   return (
//     <Tooltip>
//       <TooltipTrigger
//         render={<Button size="icon-sm" variant="ghost" {...props} />}
//       />
//       <TooltipContent>{tooltip}</TooltipContent>
//     </Tooltip>
//   );
// }
