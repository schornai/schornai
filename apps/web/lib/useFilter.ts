"use client";

import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import type { IFuseOptions } from "fuse.js";
import { useDebounce } from "@schornio/aibox-package-ui/hooks/use-debounce";

export function useFilter<TData>(
  data: TData[],
  filterOptions?: IFuseOptions<TData>,
) {
  const [filter, setFilter] = useState("");

  const fnFilter = useMemo(
    () => new Fuse(data, filterOptions),
    [data, filterOptions],
  );
  const filterDebounced = useDebounce(filter, 250);
  const filteredData =
    filterDebounced && fnFilter
      ? fnFilter?.search(filterDebounced).map((result) => result.item)
      : data;

  return {
    filter,
    filteredData,
    setFilter,
  };
}
