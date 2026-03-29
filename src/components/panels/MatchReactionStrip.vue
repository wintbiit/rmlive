<script setup lang="ts">
import { MATCH_REACTION_PRESETS } from '@/config/matchReactions';
import { useMatchEngagementStore } from '@/stores/matchEngagement';
import { useRmDataStore } from '@/stores/rmData';
import Button from 'primevue/button';
import Chip from 'primevue/chip';
import Fieldset from 'primevue/fieldset';
import { useThrottleFn } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

const rm = useRmDataStore();
const engagement = useMatchEngagementStore();
const { runningMatchForSelectedZone } = storeToRefs(rm);

const visible = computed(() => {
  const m = runningMatchForSelectedZone.value;
  if (!m) {
    return false;
  }
  const u = String(m.statusRaw ?? '').toUpperCase();
  return ['STARTED', 'PLAYING'].includes(u);
});

function countFor(id: string): number {
  return engagement.reactions[id] ?? 0;
}

const bumpReaction = useThrottleFn((id: string) => {
  void engagement.sendReaction(id);
}, 120);
</script>

<template>
  <Fieldset v-if="visible" legend="对局评价" :toggleable="true" class="reaction-fieldset">
    <div class="preset-row">
      <Button
        v-for="p in MATCH_REACTION_PRESETS"
        :key="p.id"
        :label="`${p.emoji} ${p.label}`"
        size="small"
        outlined
        @click="bumpReaction(p.id)"
      />
    </div>
    <div v-if="MATCH_REACTION_PRESETS.some((p) => countFor(p.id) > 0)" class="counts-row">
      <Chip
        v-for="p in MATCH_REACTION_PRESETS"
        :key="'chip-' + p.id"
        v-show="countFor(p.id) > 0"
        :label="`${p.emoji} ${countFor(p.id)}`"
        class="reaction-chip"
        @click="bumpReaction(p.id)"
      />
    </div>
  </Fieldset>
</template>

<style scoped>
.reaction-fieldset {
  margin-top: 0.75rem;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.counts-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.5rem;
}

.reaction-chip {
  cursor: pointer;
}
</style>
