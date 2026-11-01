import { useEffect, useState } from "react";
import type { Array as YArray } from "yjs";

export function useRealtimeArray<T>(yArray?: YArray<T>): T[] {
  const [value, setValue] = useState(yArray?.toArray() ?? []);

  useEffect(() => {
    if (yArray) {
      const sync = () => {
        setValue(yArray.toArray());
      };

      yArray.observe(sync);

      sync();

      return () => {
        yArray.unobserve(sync);
      };
    }

    return undefined;
  }, [yArray]);

  return value;
}
