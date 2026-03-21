<script setup lang="ts">
import Card from 'primevue/card';
import Panel from 'primevue/panel';
import Tag from 'primevue/tag';
import { computed } from 'vue';
import { resolvePayloadByZone, toMatchView } from '../../services/matchView';
import type { CurrentAndNextMatches } from '../../types/api';
import MatchBlock from './MatchBlock.vue';

interface Props {
  payload: CurrentAndNextMatches | null;
  selectedZoneId: string | null;
  selectedZoneName: string | null;
  selectedZoneLiveState?: number | null;
  nextExpanded?: boolean;
  teamGroupMap?: Record<string, { group: string; rank: string }>;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  teamSelect: [teamName: string];
  updateNextExpanded: [expanded: boolean];
}>();

const zonePayload = computed(() => resolvePayloadByZone(props.payload, props.selectedZoneId, props.selectedZoneName));
const current = computed(() => toMatchView(zonePayload.value?.currentMatch));
const next = computed(() => toMatchView(zonePayload.value?.nextMatch));

function onSelectTeam(teamName: string) {
  emit('teamSelect', teamName);
}

function onNextPanelCollapsedChange(collapsed: boolean) {
  emit('updateNextExpanded', !collapsed);
}

const liveStateTag = computed(() => {
  if (props.selectedZoneLiveState === 1) {
    return { label: '直播中', severity: 'success' as const };
  }
  return { label: '未直播', severity: 'warn' as const };
});
</script>

<template>
  <Card>
    <template #title> 当前对局 </template>
    <template #content>
      <div class="hero-meta">
        <Tag severity="contrast" :value="props.selectedZoneName ?? '未选择站点'" />
        <Tag :severity="liveStateTag.severity" :value="liveStateTag.label" />
      </div>

      <MatchBlock
        title="当前对局"
        :match="current"
        :hero="true"
        :team-group-map="props.teamGroupMap"
        start-prefix="开始"
        @team-select="onSelectTeam"
      />

      <Panel
        toggleable
        class="next-panel"
        :collapsed="!props.nextExpanded"
        @update:collapsed="onNextPanelCollapsedChange"
      >
        <template #header>
          <div class="next-header">
            <h3>{{ next ? '下一场对局' : '暂无下一场信息' }}</h3>
            <Tag v-if="next" :value="next.status" severity="contrast" />
          </div>
        </template>

        <MatchBlock
          title="下一场对局"
          :match="next"
          :compact="true"
          :team-group-map="props.teamGroupMap"
          start-prefix="预计"
          @team-select="onSelectTeam"
        />
      </Panel>
    </template>
  </Card>
</template>

<style scoped>
.hero-meta {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.55rem;
}

.next-panel {
  margin-top: 0.6rem;
  border: 1px solid rgb(148 163 184 / 0.24);
  border-radius: 0.65rem;
}

.next-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.next-header h3 {
  margin: 0;
  font-size: 0.92rem;
}

.next-panel :deep(.p-panel-header) {
  padding: 0.5rem 0.7rem;
}

.next-panel :deep(.p-panel-content) {
  padding: 0.55rem 0.7rem 0.6rem;
}

@media (max-width: 760px) {
  .next-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
