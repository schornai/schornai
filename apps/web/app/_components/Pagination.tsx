"use client";

import {
  PaginationContent,
  Pagination as PaginationCore,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@schornio/aibox-package-ui/components/pagination";
import { useT } from "next-i18next/client";

export function Pagination({
  max,
  onChange,
  value = 0,
}: {
  max: number;
  onChange?: (page: number) => void;
  value?: number;
}) {
  const { t } = useT("common", { keyPrefix: "_components.Pagination" });
  if (max < 2) {
    return undefined;
  }

  return (
    <PaginationCore>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            aria-label={t("labelPrev")}
            href="#"
            text={t("labelPrev")}
            onClick={(event) => {
              event.preventDefault();
              onChange?.(Math.max(0, value - 1));
            }}
          />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink
            href="#"
            isActive={value === 0}
            onClick={(event) => {
              event.preventDefault();
              onChange?.(0);
            }}
          >
            1
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink
            href="#"
            isActive={value === 1}
            onClick={(event) => {
              event.preventDefault();
              onChange?.(1);
            }}
          >
            2
          </PaginationLink>
        </PaginationItem>
        {max > 2 && value < 3 ? (
          <PaginationItem>
            <PaginationLink
              href="#"
              isActive={value === 2}
              onClick={(event) => {
                event.preventDefault();
                onChange?.(2);
              }}
            >
              3
            </PaginationLink>
          </PaginationItem>
        ) : undefined}
        {max > 3 ? (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        ) : undefined}
        {max > 2 && value > 2 ? (
          <PaginationItem>
            <PaginationLink href="#" isActive>
              {value + 1}
            </PaginationLink>
          </PaginationItem>
        ) : undefined}
        <PaginationItem>
          <PaginationNext
            aria-label={t("labelNext")}
            href="#"
            text={t("labelNext")}
            onClick={(event) => {
              event.preventDefault();
              onChange?.(Math.min(max - 1, value + 1));
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </PaginationCore>
  );
}
