"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type UseIdleTimerOptions = {
  /** Idle timeout in milliseconds */
  timeout: number;
  /** Callback when idle state is entered */
  onIdle?: () => void;
  /** Callback when activity resumes */
  onActive?: () => void;
  /** Events to track for activity */
  events?: string[];
  /** Whether the timer is enabled */
  enabled?: boolean;
};

export function useIdleTimer({
  timeout,
  onIdle,
  onActive,
  events = ["pointerdown", "pointermove", "keydown", "touchstart"],
  enabled = true,
}: UseIdleTimerOptions) {
  const [isIdle, setIsIdle] = useState(false);
  const [remaining, setRemaining] = useState(timeout);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef(Date.now());

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (!enabled) return;

    clearTimers();
    lastActivityRef.current = Date.now();
    setRemaining(timeout);

    if (isIdle) {
      setIsIdle(false);
      onActive?.();
    }

    timerRef.current = setTimeout(() => {
      setIsIdle(true);
      onIdle?.();
    }, timeout);

    // Update remaining time every second
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const newRemaining = Math.max(0, timeout - elapsed);
      setRemaining(newRemaining);
    }, 1000);
  }, [enabled, timeout, isIdle, onIdle, onActive, clearTimers]);

  // Setup event listeners
  useEffect(() => {
    if (!enabled) {
      clearTimers();
      setIsIdle(false);
      return;
    }

    const handleActivity = () => resetTimer();

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Initial timer start
    resetTimer();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      clearTimers();
    };
  }, [enabled, events, resetTimer, clearTimers]);

  /** Force activate (e.g., after user interaction) */
  const activate = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  /** Force idle state */
  const pause = useCallback(() => {
    clearTimers();
    setIsIdle(true);
    onIdle?.();
  }, [clearTimers, onIdle]);

  return {
    isIdle,
    remaining,
    activate,
    pause,
  };
}

