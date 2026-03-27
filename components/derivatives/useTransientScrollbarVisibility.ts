"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SCROLLBAR_VISIBILITY_MS = 700;

export function useTransientScrollbarVisibility(enabled: boolean) {
  const [isScrollbarVisible, setIsScrollbarVisible] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!enabled) return;

    setIsScrollbarVisible(true);
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      setIsScrollbarVisible(false);
      hideTimeoutRef.current = null;
    }, SCROLLBAR_VISIBILITY_MS);
  }, [clearHideTimeout, enabled]);

  useEffect(() => {
    if (enabled) return;

    setIsScrollbarVisible(false);
    clearHideTimeout();
  }, [clearHideTimeout, enabled]);

  useEffect(() => () => clearHideTimeout(), [clearHideTimeout]);

  return {
    isScrollbarVisible,
    handleScroll,
  };
}
