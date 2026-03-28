import { putPrefsToDb } from '@/lib/scheduleNotifyDb';
import type { NotifyPolicy } from '@/utils/scheduleNotifyDiff';
import { useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import { watch } from 'vue';

export const useScheduleNotifyStore = defineStore('scheduleNotify', () => {
  const policy = useLocalStorage<NotifyPolicy>('rm-schedule-notify-policy', 'all');
  const followedMatchIds = useLocalStorage<string[]>('rm-schedule-notify-follows', []);

  async function syncPrefsToIdb(): Promise<void> {
    await putPrefsToDb({
      policy: policy.value,
      followedMatchIds: followedMatchIds.value,
    });
    if (!('serviceWorker' in navigator)) {
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      reg.active?.postMessage({ type: 'PREFS_UPDATED' });
    } catch {
      /* ignore */
    }
  }

  watch(
    [policy, followedMatchIds],
    () => {
      void syncPrefsToIdb();
    },
    { deep: true },
  );

  function toggleFollowMatchId(id: string): void {
    if (!id || id === '-') {
      return;
    }
    const next = new Set(followedMatchIds.value);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    followedMatchIds.value = [...next];
  }

  function isFollowing(id: string): boolean {
    return id ? followedMatchIds.value.includes(id) : false;
  }

  return {
    policy,
    followedMatchIds,
    syncPrefsToIdb,
    toggleFollowMatchId,
    isFollowing,
  };
});
