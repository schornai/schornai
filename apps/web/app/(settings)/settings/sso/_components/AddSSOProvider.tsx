"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@schornio/aibox-package-ui/components/dialog";
import {
  Field,
  FieldGroup,
  FieldSeparator,
} from "@schornio/aibox-package-ui/components/field";
import { useId, useState } from "react";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { CirclePlus } from "lucide-react";
import { Input } from "@schornio/aibox-package-ui/components/input";
import { Label } from "@schornio/aibox-package-ui/components/label";
import { Textarea } from "@schornio/aibox-package-ui/components/textarea";
import { addSSOProvider } from "../_actions/addSSOProvider";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useT } from "next-i18next/client";

export function AddSSOProvider() {
  const metadataAsUrlInputId = useId();
  const metadataAsXMLInputId = useId();

  const { t } = useT("settings", {
    keyPrefix: "_components.AddSSOProvider",
  });

  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const { executeAsync, isPending } = useAction(addSSOProvider, actionUtils);

  const [metadataAsUrl, setMetadataAsUrl] = useState("");
  const [metadataAsXML, setMetadataAsXML] = useState("");

  const [open, setOpen] = useState(false);

  const hasInput = metadataAsUrl.length > 0 || metadataAsXML.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <CirclePlus /> {t("labelAdd")}
          </Button>
        }
      />
      <DialogContent className="max-w-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <Label htmlFor={metadataAsUrlInputId}>
              {t("labelMetadataUrl")}
            </Label>
            <Input
              id={metadataAsUrlInputId}
              onChange={(event) => setMetadataAsUrl(event.currentTarget.value)}
              placeholder="http://..."
              value={metadataAsUrl}
            />
          </Field>
          <FieldSeparator>{t("labelOr")}</FieldSeparator>
          <Field>
            <Label htmlFor={metadataAsXMLInputId}>{t("labelMetadata")}</Label>
            <Textarea
              className="max-h-[40svh] min-h-28 overflow-y-scroll"
              id={metadataAsXMLInputId}
              onChange={(event) => setMetadataAsXML(event.currentTarget.value)}
              placeholder={
                '<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" ...'
              }
              value={metadataAsXML}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose>{t("labelCancel")}</DialogClose>
          <ButtonAction
            disabled={!hasInput}
            hasErrored={hasErrored}
            hasSucceeded={hasSucceeded}
            isPending={isPending}
            onClick={(event) => {
              event.preventDefault();
              void executeAsync({
                metadataAsUrl,
                metadataAsXML,
              }).then(() => setOpen(false));
            }}
          >
            <CirclePlus /> {t("labelAdd")}
          </ButtonAction>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
