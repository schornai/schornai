import { useEffect, useState } from "react";
import type { TypedYMap } from "@schornio/aibox-realtime/_lib/TypedYMap";

export function useRealtimeTypedMap<T extends Record<string, unknown>>(
  yType?: TypedYMap<T>,
): Partial<T> | undefined {
  const [value, setValue] = useState(yType?.getObject());

  useEffect(() => {
    if (yType) {
      const sync = () => {
        setValue(yType.getObject());
      };

      sync();

      yType.observe(sync);

      return () => {
        yType.unobserve(sync);
      };
    }

    return undefined;
  }, [yType]);

  return value;
}
