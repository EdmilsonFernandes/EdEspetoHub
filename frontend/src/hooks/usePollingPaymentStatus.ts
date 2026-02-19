import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type PollingCheckResult =
  | string
  | null
  | undefined
  | {
      status?: string | null;
      tipStatus?: string | null;
    };

type UsePollingPaymentStatusParams = {
  id?: string | number | null;
  status?: string | null;
  enabled?: boolean;
  intervalMs?: number;
  timeoutMs?: number;
  checkStatus: () => Promise<PollingCheckResult>;
};

const TERMINAL_STATUSES = new Set(['PAID', 'FAILED', 'NONE', 'EXPIRED']);

const normalizeStatus = (value: PollingCheckResult): string => {
  if (!value) return '';
  if (typeof value === 'string') return value.toUpperCase();
  const raw = value.tipStatus || value.status || '';
  return String(raw).toUpperCase();
};

export function usePollingPaymentStatus({
  id,
  status,
  enabled = true,
  intervalMs = 5000,
  timeoutMs = 4 * 60 * 1000,
  checkStatus,
}: UsePollingPaymentStatusParams) {
  const timerRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const checkingRef = useRef(false);
  const startedAtRef = useRef(0);
  const errorStreakRef = useRef(0);

  const [isPolling, setIsPolling] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [connectionUnstable, setConnectionUnstable] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [clockNow, setClockNow] = useState(Date.now());

  const normalizedStatus = String(status || '').toUpperCase();
  const isTerminalStatus = TERMINAL_STATUSES.has(normalizedStatus);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopPolling = useCallback(() => {
    clearTimer();
    activeRef.current = false;
    checkingRef.current = false;
    setIsPolling(false);
    setIsChecking(false);
  }, [clearTimer]);

  const scheduleNext = useCallback(
    (delayMs: number, runner: () => void) => {
      clearTimer();
      timerRef.current = window.setTimeout(runner, delayMs);
    },
    [clearTimer]
  );

  const runCheck = useCallback(
    async (runner: () => void) => {
      if (!activeRef.current || checkingRef.current) return;
      checkingRef.current = true;
      setIsChecking(true);

      try {
        const nextStatus = normalizeStatus(await checkStatus());
        const now = Date.now();
        setLastCheckedAt(now);
        setConnectionUnstable(false);
        errorStreakRef.current = 0;

        if (TERMINAL_STATUSES.has(nextStatus)) {
          stopPolling();
          return;
        }

        if (now - startedAtRef.current >= timeoutMs) {
          setTimedOut(true);
          stopPolling();
          return;
        }

        scheduleNext(intervalMs, runner);
      } catch {
        const now = Date.now();
        setLastCheckedAt(now);
        setConnectionUnstable(true);
        errorStreakRef.current += 1;

        if (now - startedAtRef.current >= timeoutMs) {
          setTimedOut(true);
          stopPolling();
          return;
        }

        const delay = errorStreakRef.current >= 3 ? Math.min(10000, intervalMs + 3000) : intervalMs;
        scheduleNext(delay, runner);
      } finally {
        checkingRef.current = false;
        setIsChecking(false);
      }
    },
    [checkStatus, intervalMs, scheduleNext, stopPolling, timeoutMs]
  );

  const startPolling = useCallback(() => {
    if (!enabled || !id || isTerminalStatus) {
      stopPolling();
      return;
    }

    clearTimer();
    activeRef.current = true;
    errorStreakRef.current = 0;
    startedAtRef.current = Date.now();
    setTimedOut(false);
    setConnectionUnstable(false);
    setIsPolling(true);

    const runner = () => {
      void runCheck(runner);
    };
    runner();
  }, [clearTimer, enabled, id, isTerminalStatus, runCheck, stopPolling]);

  const verifyNow = useCallback(() => {
    if (!enabled || !id) return;
    if (timedOut) {
      startedAtRef.current = Date.now();
      setTimedOut(false);
    }
    if (!activeRef.current) {
      activeRef.current = true;
      setIsPolling(true);
    }
    const runner = () => {
      void runCheck(runner);
    };
    runner();
  }, [enabled, id, runCheck, timedOut]);

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  useEffect(() => {
    if (!isPolling || !lastCheckedAt) return;
    const interval = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [isPolling, lastCheckedAt]);

  const lastCheckedAgoSec = useMemo(() => {
    if (!lastCheckedAt) return null;
    return Math.max(0, Math.floor((clockNow - lastCheckedAt) / 1000));
  }, [clockNow, lastCheckedAt]);

  return {
    isPolling,
    isChecking,
    connectionUnstable,
    timedOut,
    lastCheckedAt,
    lastCheckedAgoSec,
    verifyNow,
  };
}

