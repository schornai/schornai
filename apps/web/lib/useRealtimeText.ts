import { useEffect, useState } from "react";
import type { Text as YText } from "yjs";

export function useRealtimeText(yText?: YText): string {
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  const [value, setValue] = useState(yText?.toString() ?? "");

  useEffect(() => {
    if (yText) {
      const sync = () => {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        setValue(yText.toString());
      };

      sync();

      yText.observe(sync);

      return () => {
        yText.unobserve(sync);
      };
    }

    return undefined;
  }, [yText]);

  return value;
}
