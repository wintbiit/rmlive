import { onMounted, onUnmounted } from 'vue';

/** Aligned with default schedule poll in rmData (see rmApi startRmPolling). */
const POLL_MS = 45_000;

/**
 * While the app tab is visible, ping the service worker to fetch schedule.json and run diff + notifications.
 * Background Sync / Periodic Sync are best-effort registrations (Chromium); see comments in `src/sw.ts`.
 */
export function useScheduleNotifyPolling(): void {
  let timer: ReturnType<typeof setInterval> | null = null;

  onMounted(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    void navigator.serviceWorker.ready.then((reg) => {
      const ping = () => {
        if (document.visibilityState === 'visible') {
          reg.active?.postMessage({ type: 'POLL_SCHEDULE' });
        }
      };

      timer = setInterval(ping, POLL_MS);
      ping();

      try {
        const anyReg = reg as ServiceWorkerRegistration & {
          sync?: { register: (tag: string) => Promise<void> };
        };
        if (anyReg.sync) {
          void anyReg.sync.register('schedule-sync').catch(() => {});
        }
      } catch {
        /* ignore */
      }

      try {
        const anyReg = reg as ServiceWorkerRegistration & {
          periodicSync?: { register: (tag: string, opts: { minInterval: number }) => Promise<void> };
        };
        if (anyReg.periodicSync) {
          void anyReg.periodicSync.register('schedule', { minInterval: 15 * 60 * 1000 }).catch(() => {});
        }
      } catch {
        /* ignore */
      }
    });
  });

  onUnmounted(() => {
    if (timer) {
      clearInterval(timer);
    }
  });
}
