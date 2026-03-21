<script setup lang="ts">
import Card from 'primevue/card';
import Divider from 'primevue/divider';
import Tag from 'primevue/tag';
import { computed } from 'vue';
import { resolvePayloadByZone, toMatchView } from '../../services/matchView';
import type { CurrentAndNextMatches } from '../../types/api';
import TeamInfoCard from '../common/TeamInfoCard.vue';

interface Props {
  payload: CurrentAndNextMatches | null;
  selectedZoneId: string | null;
  selectedZoneName: string | null;
  teamGroupMap?: Record<string, { group: string; rank: string }>;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  teamSelect: [teamName: string];
}>();

const zonePayload = computed(() => resolvePayloadByZone(props.payload, props.selectedZoneId, props.selectedZoneName));
const current = computed(() => toMatchView(zonePayload.value?.currentMatch));
const next = computed(() => toMatchView(zonePayload.value?.nextMatch));

function onSelectTeam(teamName: string) {
  emit('teamSelect', teamName);
}

function toGroupLabel(teamName: string): string {
  const meta = props.teamGroupMap?.[teamName];
  if (!meta) {
    return '';
  }

  return `${meta.group}组 #${meta.rank}`;
}
</script>

<template>
  <Card>
    <template #title> 当前对局 </template>
    <template #content>
      <section class="block">
        <header class="block-head">
          <h3>{{ current ? '当前对局' : '暂无当前对局' }}</h3>
          <Tag v-if="current" :value="current.status" severity="info" />
        </header>
        <div v-if="current" class="team-row">
          <TeamInfoCard
            :team-name="current.redTeam.teamName"
            :college-name="current.redTeam.collegeName"
            :logo="current.redTeam.logo"
            :group-label="toGroupLabel(current.redTeam.teamName)"
            @select="onSelectTeam"
          />

          <div class="score-card">
            <div class="big-score">{{ current.score }}</div>
            <div class="small-score">小局 {{ current.gameScore }}</div>
          </div>

          <TeamInfoCard
            :team-name="current.blueTeam.teamName"
            :college-name="current.blueTeam.collegeName"
            :logo="current.blueTeam.logo"
            :group-label="toGroupLabel(current.blueTeam.teamName)"
            @select="onSelectTeam"
          />
        </div>

        <p>阶段: {{ current?.stage ?? '-' }}</p>
        <p>场次: {{ current?.orderNumber ?? '-' }}</p>
        <p>开始时间: {{ current?.startAt ?? '-' }}</p>
      </section>

      <Divider />

      <section class="block">
        <header class="block-head">
          <h3>{{ next ? '下一场对局' : '暂无下一场信息' }}</h3>
          <Tag v-if="next" :value="next.status" severity="contrast" />
        </header>
        <div v-if="next" class="team-row">
          <TeamInfoCard
            :team-name="next.redTeam.teamName"
            :college-name="next.redTeam.collegeName"
            :logo="next.redTeam.logo"
            :group-label="toGroupLabel(next.redTeam.teamName)"
            @select="onSelectTeam"
          />

          <div class="score-card">
            <div class="big-score">{{ next.score }}</div>
            <div class="small-score">小局 {{ next.gameScore }}</div>
          </div>

          <TeamInfoCard
            :team-name="next.blueTeam.teamName"
            :college-name="next.blueTeam.collegeName"
            :logo="next.blueTeam.logo"
            :group-label="toGroupLabel(next.blueTeam.teamName)"
            @select="onSelectTeam"
          />
        </div>

        <p>阶段: {{ next?.stage ?? '-' }}</p>
        <p>场次: {{ next?.orderNumber ?? '-' }}</p>
        <p>预计开始: {{ next?.startAt ?? '-' }}</p>
      </section>
    </template>
  </Card>
</template>

<style scoped>
.block h3 {
  margin: 0;
  font-size: 1.05rem;
}

.block p {
  margin: 0.45rem 0 0;
  opacity: 0.92;
}

.block-head {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  justify-content: space-between;
}

.team-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 0.8rem;
  align-items: center;
  margin-top: 0.75rem;
}

.score-card {
  text-align: center;
}

.big-score {
  font-size: 1.2rem;
  font-weight: 700;
}

.small-score {
  font-size: 0.78rem;
  opacity: 0.8;
}
</style>
