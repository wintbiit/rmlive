<script setup lang="ts">
import Card from 'primevue/card';
import Tab from 'primevue/tab';
import TabList from 'primevue/tablist';
import TabPanel from 'primevue/tabpanel';
import TabPanels from 'primevue/tabpanels';
import Tabs from 'primevue/tabs';
import Tag from 'primevue/tag';
import { computed, ref } from 'vue';
import { getScheduleRows, isResultStatus, toStatusSeverity } from '../../services/scheduleView';
import type { Schedule } from '../../types/api';
import TeamInfoCard from '../common/TeamInfoCard.vue';

interface Props {
  payload: Schedule | null;
  selectedZoneId: string | null;
  teamGroupMap?: Record<string, { group: string; rank: string }>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  teamSelect: [teamName: string];
}>();
const rows = computed(() => getScheduleRows(props.payload, props.selectedZoneId));
const tab = ref<'schedule' | 'result'>('schedule');
const scheduleRows = computed(() => rows.value.filter((item) => !isResultStatus(item.statusRaw)));
const resultRows = computed(() => rows.value.filter((item) => isResultStatus(item.statusRaw)));

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
    <template #title> 赛程安排 </template>
    <template #content>
      <Tabs v-model:value="tab">
        <TabList>
          <Tab value="schedule">
            <span class="tab-title"><i class="pi pi-calendar" />赛程</span>
          </Tab>
          <Tab value="result">
            <span class="tab-title"><i class="pi pi-trophy" />赛果</span>
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel value="schedule">
            <div v-if="!scheduleRows.length" class="empty">暂无赛程数据</div>
            <div v-else class="match-list">
              <article v-for="item in scheduleRows" :key="`schedule-${item.id}`" class="match-card">
                <header class="match-head">
                  <div class="head-left">
                    <Tag severity="secondary" :value="item.stage" />
                    <span class="start-at"><i class="pi pi-clock" />{{ item.dateTimeLabel }}</span>
                  </div>
                  <Tag :severity="toStatusSeverity(item.statusRaw)" :value="item.status" />
                </header>

                <div class="teams">
                  <TeamInfoCard
                    compact
                    :team-name="item.redTeam.teamName"
                    :college-name="item.redTeam.collegeName"
                    :logo="item.redTeam.logo"
                    :group-label="toGroupLabel(item.redTeam.teamName)"
                    @select="onSelectTeam"
                  />
                  <TeamInfoCard
                    compact
                    :team-name="item.blueTeam.teamName"
                    :college-name="item.blueTeam.collegeName"
                    :logo="item.blueTeam.logo"
                    :group-label="toGroupLabel(item.blueTeam.teamName)"
                    @select="onSelectTeam"
                  />
                </div>
              </article>
            </div>
          </TabPanel>

          <TabPanel value="result">
            <div v-if="!resultRows.length" class="empty">暂无赛果数据</div>
            <div v-else class="match-list">
              <article v-for="item in resultRows" :key="`result-${item.id}`" class="match-card">
                <header class="match-head">
                  <div class="head-left">
                    <Tag severity="secondary" :value="item.stage" />
                    <span class="start-at"><i class="pi pi-clock" />{{ item.dateTimeLabel }}</span>
                  </div>
                  <Tag :severity="toStatusSeverity(item.statusRaw)" :value="item.status" />
                </header>

                <div class="teams">
                  <TeamInfoCard
                    compact
                    :team-name="item.redTeam.teamName"
                    :college-name="item.redTeam.collegeName"
                    :logo="item.redTeam.logo"
                    :group-label="toGroupLabel(item.redTeam.teamName)"
                    @select="onSelectTeam"
                  />
                  <TeamInfoCard
                    compact
                    :team-name="item.blueTeam.teamName"
                    :college-name="item.blueTeam.collegeName"
                    :logo="item.blueTeam.logo"
                    :group-label="toGroupLabel(item.blueTeam.teamName)"
                    @select="onSelectTeam"
                  />
                </div>

                <div class="result-score">
                  <Tag severity="contrast" icon="pi pi-chart-line" :value="`比分 ${item.score}`" />
                  <Tag severity="secondary" icon="pi pi-chart-bar" :value="`小局 ${item.gameScore}`" />
                </div>
              </article>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </template>
  </Card>
</template>

<style scoped>
.empty {
  text-align: center;
  opacity: 0.72;
  padding: 1rem 0.35rem;
}

.match-list {
  display: grid;
  gap: 0.65rem;
}

.tab-title {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.tab-title .pi {
  font-size: 0.76rem;
}

.match-card {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 0.7rem;
  padding: 0.6rem;
  background: rgba(15, 23, 42, 0.2);
}

.match-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
  margin-bottom: 0.5rem;
}

.head-left {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.start-at {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  opacity: 0.78;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.start-at .pi {
  font-size: 0.72rem;
}

.teams {
  display: grid;
  gap: 0.45rem;
}

.result-score {
  margin-top: 0.55rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.result-score :deep(.p-tag) {
  font-size: 0.74rem;
}
</style>
