"use client";

import { useEffect, useState } from "react";

export function useRecordingWakeLock(recording: boolean) {
  const [status, setStatus] = useState<"requesting" | "active" | "unavailable">(
    "requesting",
  );
  useEffect(() => {
    if (!recording) return;
    let disposed = false;
    let pending = false;
    let lock: WakeLockSentinel | undefined;
    const acquire = async () => {
      if (
        disposed ||
        pending ||
        document.visibilityState !== "visible" ||
        (lock && !lock.released)
      )
        return;
      if (!navigator.wakeLock) {
        setStatus("unavailable");
        return;
      }
      pending = true;
      setStatus("requesting");
      try {
        const next = await navigator.wakeLock.request("screen");
        if (disposed) {
          await next.release();
          return;
        }
        lock = next;
        setStatus(next.released ? "unavailable" : "active");
        next.addEventListener("release", () => {
          if (!disposed && lock === next) setStatus("unavailable");
        });
      } catch {
        if (!disposed) setStatus("unavailable");
      } finally {
        pending = false;
      }
    };
    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", acquire);
      void lock?.release().catch(() => {});
    };
  }, [recording]);
  return status;
}
