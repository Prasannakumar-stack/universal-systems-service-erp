import { useEffect, useRef, useState } from 'react';

const DEFAULT_MESSAGES = {
  public: 'Powering your service experience...',
  staff: 'Loading secure workspace...'
};

const DEFAULT_FALLBACK = 'Cannot connect to server. Please check backend is running.';

function getNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now();
  return Date.now();
}

export default function UniversalLoader({
  active = false,
  variant = 'staff',
  message,
  fallbackMessage = DEFAULT_FALLBACK,
  minVisibleMs = 1400,
  timeoutMs = 9000
}) {
  const [rendered, setRendered] = useState(false);
  const [visible, setVisible] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const renderedRef = useRef(false);
  const shownAtRef = useRef(0);
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const unmountTimerRef = useRef(null);
  const timeoutTimerRef = useRef(null);

  function setRenderedState(nextRendered) {
    renderedRef.current = nextRendered;
    setRendered(nextRendered);
  }

  function clearTimers() {
    [showTimerRef, hideTimerRef, unmountTimerRef, timeoutTimerRef].forEach((timerRef) => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    });
  }

  useEffect(() => () => {
    clearTimers();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    clearTimers();

    if (active) {
      shownAtRef.current = getNow();
      setTimedOut(false);
      setRenderedState(true);
      showTimerRef.current = window.setTimeout(() => setVisible(true), 16);
      if (timeoutMs > 0) {
        timeoutTimerRef.current = window.setTimeout(() => setTimedOut(true), timeoutMs);
      }
      return clearTimers;
    }

    if (!renderedRef.current) return undefined;

    const elapsed = Math.max(0, getNow() - shownAtRef.current);
    const remaining = Math.max(0, minVisibleMs - elapsed);
    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      unmountTimerRef.current = window.setTimeout(() => {
        setRenderedState(false);
        setTimedOut(false);
      }, 280);
    }, remaining);

    return clearTimers;
  }, [active, minVisibleMs, timeoutMs]);

  if (!rendered) return null;

  const normalizedVariant = variant === 'public' ? 'public' : 'staff';
  const loaderMessage = timedOut ? fallbackMessage : message || DEFAULT_MESSAGES[normalizedVariant];

  return (
    <div
      className={`universal-loader universal-loader-${normalizedVariant} ${visible ? 'is-visible' : 'is-leaving'}`}
      role="status"
      aria-live="polite"
      aria-busy={active}
    >
      <div className="universal-loader-panel">
        <img className="universal-loader-logo" src="/logo-full.png" alt="Universal Systems" draggable="false" decoding="async" />
        <div className="universal-loader-copy">
          <p>Universal Systems</p>
          <span>{loaderMessage}</span>
        </div>
        <div className="universal-loader-progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}
