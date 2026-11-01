"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@schornio/aibox-package-ui/components/dialog";
import { DynamicIcon, iconNames } from "lucide-react/dynamic";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@schornio/aibox-package-ui/components/input-group";
import { Trans, useT } from "next-i18next/client";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { Field } from "@schornio/aibox-package-ui/components/field";
import type { IconName } from "lucide-react/dynamic";
import { Link } from "@schornio/aibox-package-ui/components/link";
import { Pagination } from "./Pagination";
import { Search } from "lucide-react";
import { useState } from "react";

export function DialogPickerIcons({
  onValueChange,
  value,
}: {
  onValueChange?: (value: IconName) => void;
  value?: string;
}) {
  const { t } = useT("common", { keyPrefix: "_components.DialogPickerIcons" });

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);

  const filteredIconNames = iconNames.filter((iconName) =>
    iconName.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const visibleIconNames = filteredIconNames.slice(page * 49, (page + 1) * 49);

  const pages = Math.ceil(filteredIconNames.length / 49);

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button className="mx-auto mb-3 flex" size="sm" variant="ghost" />
        }
      >
        {t("buttonMoreIcons")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
        </DialogHeader>
        <ul className="mx-auto grid w-fit grid-cols-7 gap-5">
          {visibleIconNames.map((iconName) => (
            <li key={iconName}>
              <DialogClose
                render={
                  <Button
                    onClick={() => {
                      onValueChange?.(iconName);
                    }}
                    size="icon"
                    variant={value === iconName ? undefined : "outline"}
                  >
                    <DynamicIcon name={iconName} />
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
        <Pagination
          max={pages}
          onChange={(page) => setPage(page)}
          value={page}
        />
        <div className="text-muted-foreground text-center text-xs">
          <Trans
            components={[
              <Link
                href="https://lucide.dev/"
                rel="noreferrer"
                target="_blank"
              />,
            ]}
            i18nKey="textLucideInfo"
            t={t}
          />
        </div>
        <DialogFooter>
          <Field>
            <InputGroup className="bg-background">
              <InputGroupInput
                onChange={(event) => {
                  setPage(0);
                  setSearchQuery(event.currentTarget.value);
                }}
                placeholder={t("placeholderSearchIcons")}
                value={searchQuery}
              />
              <InputGroupAddon align="inline-start">
                <Search />
              </InputGroupAddon>
            </InputGroup>
          </Field>
          <DialogClose render={<Button variant="outline" />}>
            {t("buttonCancel")}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
