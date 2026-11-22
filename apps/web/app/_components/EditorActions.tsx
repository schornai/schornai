import { Fragment, type ComponentProps } from "react";
import type { LucideIcon } from "lucide-react";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { DropdownMenuSeparator } from "@schornio/aibox-package-ui/components/dropdown-menu";
import { DropdownMenuItemAction } from "@schornio/aibox-package-ui/components/dropdown-menu-item-action";

export type EditorAction = Pick<
  ComponentProps<typeof ButtonAction>,
  "disabled" | "hasErrored" | "hasSucceeded" | "isPending"
> & {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  destructive?: boolean;
  closeOnClick?: boolean;
};

export function EditorActions({
  actions,
  display,
}: {
  actions: EditorAction[];
  display: "menu" | "overview";
}) {
  const controls = actions.map(
    ({ label, icon: Icon, destructive, closeOnClick, ...props }, index) => {
      if (display === "menu") {
        return (
          <Fragment key={label}>
            {destructive && <DropdownMenuSeparator />}
            <DropdownMenuItemAction
              {...props}
              closeOnClick={closeOnClick}
              variant={destructive ? "destructive" : undefined}
            >
              <Icon /> {label}
            </DropdownMenuItemAction>
          </Fragment>
        );
      }
      return (
        <ButtonAction
          key={label}
          type="button"
          variant={
            destructive ? "destructive" : index === 0 ? "default" : "outline"
          }
          className="h-auto min-h-8 whitespace-normal"
          {...props}
        >
          <Icon /> {label}
        </ButtonAction>
      );
    },
  );
  if (display === "menu") return controls;
  return (
    <>
      <hr className="my-10" />
      <ContainerMain className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {controls}
      </ContainerMain>
    </>
  );
}
