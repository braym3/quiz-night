import { useEffect } from 'react';

// Keep the screen awake during the quiz (phones + the TV browser).
// Re-acquires the lock when the tab becomes visible again.
export default function useWakeLock(enabled = true) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    let lock = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch { /* low battery or unsupported — fine */ }
    };

    const onVisibility = () => {
      if (!cancelled && document.visibilityState === 'visible') acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (lock) lock.release().catch(() => {});
    };
  }, [enabled]);
}
