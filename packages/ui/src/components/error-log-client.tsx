"use client";

import { getServerSnapshot, getSnapshot, subscribe } from "./error-log.tsx";
import { useSyncExternalStore } from "react";

export function useErrorLogs() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
