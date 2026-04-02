<script setup lang="ts">
import { useMatchEngagementStore } from '@/stores/matchEngagement';
import { TransitionPresets, useTransition } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

const engagement = useMatchEngagementStore();
const { redSupport, blueSupport } = storeToRefs(engagement);

const animatedRedSupport = useTransition(redSupport, {
  duration: 420,
  transition: TransitionPresets.easeOutCubic,
});

const animatedBlueSupport = useTransition(blueSupport, {
  duration: 420,
  transition: TransitionPresets.easeOutCubic,
});

const animatedTotal = computed(() => animatedRedSupport.value + animatedBlueSupport.value);
const animatedRedWidth = computed(() => {
  if (animatedTotal.value <= 0) {
    return '50%';
  }
  return `${(animatedRedSupport.value / animatedTotal.value) * 100}%`;
});

const animatedBlueWidth = computed(() => {
  if (animatedTotal.value <= 0) {
    return '50%';
  }
  return `${(animatedBlueSupport.value / animatedTotal.value) * 100}%`;
});

const animatedRedCount = computed(() => Math.round(animatedRedSupport.value));
const animatedBlueCount = computed(() => Math.round(animatedBlueSupport.value));
</script>

<template>
  <div
    class="relative overflow-hidden border-x border-t border-slate-700/70 bg-slate-900/90"
    role="img"
    :aria-label="`火力支持，红方 ${animatedRedCount}，蓝方 ${animatedBlueCount}`"
  >
    <div class="flex h-8 w-full overflow-hidden sm:h-9">
      <div
        class="h-full bg-gradient-to-r from-rose-800 via-rose-600 to-rose-400 transition-[width] duration-500 ease-out"
        :style="{ width: animatedRedWidth }"
      />
      <div
        class="h-full bg-gradient-to-r from-sky-400 via-sky-500 to-sky-700 transition-[width] duration-500 ease-out"
        :style="{ width: animatedBlueWidth }"
      />
    </div>
    <div class="pointer-events-none absolute inset-y-0 left-1/2 z-10 flex -translate-x-1/2 items-center justify-center">
      <svg viewBox="0 0 64 46" class="h-7 w-10 sm:h-8 sm:w-11" aria-hidden="true">
        <defs>
          <linearGradient id="pkBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#f8fafc" stop-opacity="0.95" />
            <stop offset="100%" stop-color="#cbd5e1" stop-opacity="0.9" />
          </linearGradient>
        </defs>
        <path d="M12 4h40l8 19-8 19H12L4 23z" fill="url(#pkBg)" stroke="#0f172a" stroke-opacity="0.35" />
        <text
          x="32"
          y="29"
          text-anchor="middle"
          font-size="18"
          font-weight="800"
          fill="#0f172a"
          style="font-family: ui-sans-serif, system-ui, sans-serif"
        >
          PK
        </text>
      </svg>
    </div>

    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3">
      <span class="text-xs font-semibold tabular-nums text-white sm:text-sm">{{ animatedRedCount }}</span>
    </div>
    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
      <span class="text-xs font-semibold tabular-nums text-white sm:text-sm">{{ animatedBlueCount }}</span>
    </div>
  </div>
</template>
