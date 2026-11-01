"use client";

import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay: number = 1000) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
