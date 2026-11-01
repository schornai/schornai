import { useEffect, useState } from "react";
import type { Map as YMap } from "yjs";

export function useRealtimeMap<T>(yMap: YMap<T>): Map<string, T> {
  const [value, setValue] = useState(new Map(yMap.entries()));

  useEffect(() => {
    const sync = () => {
      setValue(new Map(yMap.entries()));
    };

    yMap.observe(sync);

    sync();

    return () => {
      yMap.unobserve(sync);
    };
  }, [yMap]);

  return value;
}
