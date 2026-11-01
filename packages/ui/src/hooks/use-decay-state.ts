'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SetStateAction } from 'react';

export function useDecayState<T>(baseState: T, timeoutMs = 5000) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [state, setState] = useState<T>(baseState);

  useEffect(() => {
    return () => {
      const timeoutId = timeoutRef.current;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const setDecayState = useCallback(
    (newState: SetStateAction<T>) => {
      setState(newState);

      const timeoutId = timeoutRef.current;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const newTimeoutId = setTimeout(() => {
        setState(baseState);
      }, timeoutMs);
      timeoutRef.current = newTimeoutId;
    },
    [baseState, timeoutMs],
  );

  return [state, setDecayState] as const;
}
