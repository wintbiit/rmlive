<script setup lang="ts">
import { useMatchEngagementStore } from '@/stores/matchEngagement';
import Button from 'primevue/button';
import MeterGroup from 'primevue/metergroup';
import type { MeterItem } from 'primevue/metergroup';
import { useThrottleFn } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

const engagement = useMatchEngagementStore();
const { redSupport, blueSupport } = storeToRefs(engagement);

const meters = computed((): MeterItem[] => {
  const r = redSupport.value;
  const b = blueSupport.value;
  const t = r + b;
  if (t < 1) {
    return [
      { label: '红方 0', value: 50 },
      { label: '蓝方 0', value: 50 },
    ];
  }
  const rp = Math.round((r / t) * 100);
  return [
    { label: `红方 ${r}`, value: rp },
    { label: `蓝方 ${b}`, value: 100 - rp },
  ];
});

const onRed = useThrottleFn(() => {
  void engagement.sendSupport('red');
}, 80);

const onBlue = useThrottleFn(() => {
  void engagement.sendSupport('blue');
}, 80);
</script>

<template>
  <div class="firepower-root">
    <MeterGroup :value="meters" label-position="end" />
    <div class="firepower-actions">
      <Button label="支持红方" size="small" severity="danger" @click="onRed" />
      <Button label="支持蓝方" size="small" @click="onBlue" />
    </div>
  </div>
</template>

<style scoped>
.firepower-root {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
  min-width: 0;
}

.firepower-actions {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
