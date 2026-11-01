"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@schornio/aibox-package-ui/components/input-group";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";
import { useT } from "next-i18next/client";

export default function InputQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("query") ?? "");
  const { t } = useT("documentRepository", {
    keyPrefix: "_components.InputQuery",
  });

  return (
    <form
      className="contents"
      onSubmit={(event) => {
        event.preventDefault();

        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set("query", query);

        router.push(`${pathname}?${newSearchParams}`);
      }}
    >
      <InputGroup className="max-w-lg">
        <InputGroupAddon align="inline-start">
          <Search />
        </InputGroupAddon>

        <InputGroupInput
          onChange={(event) => setQuery(event.currentTarget.value)}
          name="query"
          placeholder={t("placeholderSearch")}
          value={query}
        />

        <InputGroupAddon align="inline-end">
          <InputGroupButton type="submit">{t("labelSearch")}</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
