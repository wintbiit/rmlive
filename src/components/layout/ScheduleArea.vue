<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
import { defineAsyncComponent } from 'vue';
import type { LiveGameInfo, Schedule } from '../../types/api';

interface TeamSelectPayload {
  teamName: string;
  zoneId?: string | null;
  zoneName?: string | null;
}

interface Props {
  isMobile: boolean;
  enabled: boolean;
  payload: Schedule | null;
  liveGameInfo: LiveGameInfo | null;
  selectedZoneId: string | null;
  teamGroupMap?: Record<string, { group: string; rank: string }>;
}

defineProps<Props>();

const emit = defineEmits<{
  teamSelect: [payload: TeamSelectPayload];
}>();

const SchedulePanel = defineAsyncComponent(() => import('../panels/SchedulePanel.vue'));

function onTeamSelect(payload: TeamSelectPayload) {
  emit('teamSelect', payload);
}
</script>

<template>
  <section class="lower-grid">
    <div v-if="enabled" class="schedule-cell">
      <SchedulePanel
        :payload="payload"
        :live-game-info="liveGameInfo"
        :selected-zone-id="selectedZoneId"
        :team-group-map="teamGroupMap"
        :is-mobile="isMobile"
        @team-select="onTeamSelect"
      />
    </div>

    <div v-else class="schedule-placeholder">
      <Skeleton width="100%" height="18rem" borderRadius="12px" />
    </div>
  </section>
</template>

<style scoped>
.lower-grid {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
  grid-template-columns: 1fr;
}

.schedule-placeholder {
  opacity: 0.6;
}
</style>
