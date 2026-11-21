"use client";
import { useId, useState } from "react";
import Link from "next/link";
import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import {
  PackagePlus,
  FolderOpen,
  Zap,
  AudioLines,
  Brain,
  BotMessageSquare,
} from "lucide-react";
import type { XRAGPackageObject } from "@schornio/aibox-package-database/xrag/packageSchema";
import {
  Button,
  buttonVariants,
} from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@schornio/aibox-package-ui/components/dialog";
import {
  Field,
  FieldLabel,
  FieldGroup,
  FieldSet,
  FieldLegend,
  FieldDescription,
} from "@schornio/aibox-package-ui/components/field";
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { Checkbox } from "@schornio/aibox-package-ui/components/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@schornio/aibox-package-ui/components/select";
import { getXRAGPackageOptions } from "../../(main)/app/xrag/_actions/getXRAGPackageOptions";
import { addXRAGPackageItem } from "../../(main)/app/xrag/_actions/addXRAGPackageItem";

const objectIcons = {
  automation: Zap,
  agent: BotMessageSquare,
  documentRepository: FolderOpen,
  transcriber: AudioLines,
  model: Brain,
};

export function XRAGPackageAddDialog({
  kind,
  id,
}: Pick<XRAGPackageObject, "kind" | "id">) {
  const { t } = useT("common", { keyPrefix: "_components.XRAGPackages" });
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [packageId, setPackageId] = useState("");
  const [selectedRelated, setSelectedRelated] = useState<string[]>([]);
  const options = useAction(getXRAGPackageOptions, {
    onSuccess: ({ data }) => {
      if (data)
        setPackageId((previous) =>
          data.packages.some((xragPackage) => xragPackage.id === previous)
            ? previous
            : data.packages.length === 1
              ? data.packages[0]!.id
              : "",
        );
    },
  });
  const add = useAction(addXRAGPackageItem, {
    onSuccess: () => setOpen(false),
  });
  const data = options.result.data;
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (add.isPending) return;
          setOpen(value);
          if (value) {
            setSelectedRelated([]);
            options.reset();
            options.execute({ kind, id });
            add.reset();
          }
        }}
      >
        <DialogTrigger render={<Button variant="outline" />}>
          <PackagePlus />
          {t("labelAdd")}
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("labelAdd")}</DialogTitle>
            {data?.packages.length === 0 && (
              <DialogDescription>
                {t("descriptionNoPackages")}
              </DialogDescription>
            )}
          </DialogHeader>
          {options.isPending && (
            <p role="status" className="text-muted-foreground text-sm">
              {t("labelLoading")}
            </p>
          )}
          {options.hasErrored && (
            <Alert variant="destructive">
              <AlertDescription>
                {t("errorLoad")}
                <ButtonAction
                  variant="outline"
                  isPending={options.isPending}
                  onClick={() => options.execute({ kind, id })}
                >
                  {t("labelRetry")}
                </ButtonAction>
              </AlertDescription>
            </Alert>
          )}
          {data && !options.isPending && !options.hasErrored && (
            <FieldGroup>
              {data.packages.length > 0 ? (
                <>
                  <Field>
                    <FieldLabel htmlFor={`${fieldId}-package`}>
                      {t("labelPackage")}
                    </FieldLabel>
                    <Select
                      value={packageId}
                      disabled={add.isPending}
                      onValueChange={(value) => setPackageId(value ?? "")}
                    >
                      <SelectTrigger id={`${fieldId}-package`}>
                        <SelectValue>
                          {data.packages.find(
                            (xragPackage) => xragPackage.id === packageId,
                          )?.name ?? t("labelChoose")}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {data.packages.map((xragPackage) => (
                            <SelectItem
                              key={xragPackage.id}
                              value={xragPackage.id}
                            >
                              {xragPackage.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  {data.related.length > 0 && (
                    <FieldSet>
                      <FieldLegend>{t("labelRelated")}</FieldLegend>
                      <div className="flex max-h-64 flex-col gap-3 overflow-y-auto">
                        {data.related.map((object, index) => {
                          const key = `${object.kind}:${object.id}`;
                          const Icon = objectIcons[object.kind];
                          return (
                            <Field key={key} orientation="horizontal">
                              <Checkbox
                                id={`${fieldId}-related-${index}`}
                                disabled={add.isPending}
                                checked={selectedRelated.includes(key)}
                                onCheckedChange={(checked) =>
                                  setSelectedRelated((previous) =>
                                    checked
                                      ? [...previous, key]
                                      : previous.filter(
                                          (value) => value !== key,
                                        ),
                                  )
                                }
                              />
                              <FieldLabel
                                htmlFor={`${fieldId}-related-${index}`}
                              >
                                <Icon
                                  className="size-4 shrink-0"
                                  aria-hidden="true"
                                />
                                {object.name}
                                <span className="text-muted-foreground">
                                  {t(`kind.${object.kind}`)}
                                </span>
                              </FieldLabel>
                            </Field>
                          );
                        })}
                      </div>
                      <FieldDescription className="text-xs">
                        {t("descriptionRelated")}
                      </FieldDescription>
                    </FieldSet>
                  )}
                  <ButtonAction
                    isPending={add.isPending}
                    hasErrored={add.hasErrored}
                    disabled={add.isPending || !packageId}
                    onClick={() =>
                      add.execute({
                        packageId,
                        selection: { kind, id },
                        related: data.related
                          .filter((object) =>
                            selectedRelated.includes(
                              `${object.kind}:${object.id}`,
                            ),
                          )
                          .map(({ kind, id }) => ({ kind, id })),
                      })
                    }
                  >
                    {t("labelAdd")}
                  </ButtonAction>
                  {add.hasErrored && (
                    <Alert variant="destructive">
                      <AlertDescription>{t("errorAdd")}</AlertDescription>
                    </Alert>
                  )}
                </>
              ) : (
                <Link
                  href="/app/xrag/export"
                  className={buttonVariants({
                    variant: "ghost",
                    className: "self-start",
                  })}
                >
                  <PackagePlus />
                  {t("labelCreate")}
                </Link>
              )}
            </FieldGroup>
          )}
        </DialogContent>
      </Dialog>
      {add.hasSucceeded && add.input?.packageId && (
        <Button
          nativeButton={false}
          variant="link"
          render={
            <Link
              href={`/app/xrag/export#xrag-package-${add.input.packageId}`}
            />
          }
        >
          {t("labelOpenPackage")}
        </Button>
      )}
    </>
  );
}
