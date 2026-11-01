"use client";

import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import type { ComponentProps } from "react";
import { signOut } from "../_actions/signOut";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";

export function SignOutButton(props: ComponentProps<typeof ButtonAction>) {
  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const { execute, isPending } = useAction(signOut, actionUtils);

  return (
    <ButtonAction
      hasErrored={hasErrored}
      hasSucceeded={hasSucceeded}
      isPending={isPending}
      onClick={() => execute()}
      {...props}
    />
  );
}
