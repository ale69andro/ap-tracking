"use client";

import { useEffect } from "react";

/**
 * Locks body scroll while `locked` is true.
 *
 * Uses the position:fixed pattern so it works on iOS Safari, where
 * overflow:hidden alone does not prevent native momentum scroll.
 * Saves and restores the previous values of the four properties it
 * touches so it never clobbers unrelated inline styles.
 */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const body = document.body;

    // Save existing inline values (empty string if not set).
    const prevOverflow = body.style.overflow;
    const prevPosition = body.style.position;
    const prevTop      = body.style.top;
    const prevWidth    = body.style.width;

    // Capture scroll position before fixing the body.
    const scrollY = window.scrollY;

    // Lock: position:fixed + top offset keeps the visual position unchanged
    // while preventing the browser (including iOS Safari) from scrolling body.
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top      = `-${scrollY}px`;
    body.style.width    = "100%";

    return () => {
      // Restore the exact previous values.
      body.style.overflow = prevOverflow;
      body.style.position = prevPosition;
      body.style.top      = prevTop;
      body.style.width    = prevWidth;

      // Bring the page back to where the user was.
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
