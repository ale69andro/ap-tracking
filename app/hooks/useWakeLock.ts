import { useEffect, useRef } from "react";

export function useWakeLock(enabled: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!enabled) {
      // Release any existing sentinel when disabled
      if (sentinelRef.current) {
        try {
          sentinelRef.current.release();
        } catch {
          // ignore
        }
        sentinelRef.current = null;
      }
      return;
    }

    async function requestLock() {
      // Guard: skip if already holding an active sentinel
      if (sentinelRef.current && !sentinelRef.current.released) return;

      // Guard: skip if API not available
      if (!navigator.wakeLock?.request) return;

      try {
        sentinelRef.current = await navigator.wakeLock.request("screen");
      } catch {
        // Fail silently (e.g. battery saver, permissions denied)
        sentinelRef.current = null;
      }
    }

    requestLock();

    function handleVisibilityChange() {
      // Only re-request if: page visible, enabled is still true (closure),
      // and there is no active non-released sentinel
      if (
        document.visibilityState === "visible" &&
        (!sentinelRef.current || sentinelRef.current.released)
      ) {
        requestLock();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // Release on unmount
      if (sentinelRef.current) {
        try {
          sentinelRef.current.release();
        } catch {
          // ignore
        }
        sentinelRef.current = null;
      }
    };
  }, [enabled]);
}
