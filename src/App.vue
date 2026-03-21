<script setup lang="ts">
import { storeToRefs } from 'pinia';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { computed, onBeforeUnmount, onMounted } from 'vue';
import LivePlayer from './components/live/LivePlayer.vue';
import CurrentMatchPanel from './components/panels/CurrentMatchPanel.vue';
import MobileSchedulePanel from './components/panels/MobileSchedulePanel.vue';
import RobotDataPanel from './components/panels/RobotDataPanel.vue';
import SchedulePanel from './components/panels/SchedulePanel.vue';
import { useRmDataStore } from './stores/rmData';
import { useUiStore } from './stores/ui';

const dataStore = useRmDataStore();
const uiStore = useUiStore();

const {
  currentAndNextMatches,
  robotData,
  schedule,
  selectedZone,
  selectedZoneId,
  selectedQualityRes,
  streamLoading,
  effectiveStreamUrl,
  effectiveStreamErrorMessage,
  hasError,
  lastUpdated,
  selectedZoneName,
  zoneOptions,
  qualityOptions,
  teamGroupMap,
  groupSections,
} = storeToRefs(dataStore);

const { isDark, dataDialogVisible, dataDialogTeam, isMobile, nextMatchExpanded } = storeToRefs(uiStore);

const dialogTeamGroupSection = computed(() => {
  if (!dataDialogTeam.value) {
    return null;
  }

  for (const section of groupSections.value) {
    if (section.teams.some((team) => team.teamName === dataDialogTeam.value)) {
      return section;
    }
  }

  return null;
});

const onZoneChange = dataStore.setZone;
const onQualityChange = dataStore.setQuality;
const retryLiveStream = dataStore.retryLiveStream;

const onOpenTeamData = uiStore.openTeamData;
const toggleTheme = uiStore.toggleTheme;
const onNextExpandedChange = uiStore.setNextMatchExpanded;

onMounted(() => {
  uiStore.initializeUi();
  dataStore.startPolling();
});

onBeforeUnmount(() => {
  uiStore.teardownUi();
  dataStore.stopPolling();
});
</script>

<template>
  <main class="app-shell">
    <Card class="controls-card">
      <template #content>
        <div class="controls">
          <Tag :severity="hasError ? 'danger' : 'success'" :value="hasError ? '部分数据异常' : '数据更新中'" />
          <Tag severity="info" :value="`最近刷新: ${lastUpdated}`" />

          <Select
            :model-value="selectedZoneId"
            :options="zoneOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="选择直播间"
            class="zone-select"
            @update:model-value="onZoneChange"
          />

          <Select
            :model-value="selectedQualityRes"
            :options="qualityOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="选择清晰度"
            class="quality-select"
            @update:model-value="onQualityChange"
          />

          <Button size="small" :label="isDark ? '切换浅色' : '切换深色'" outlined @click="toggleTheme" />
        </div>
      </template>
    </Card>

    <section class="match-hero">
      <CurrentMatchPanel
        :key="selectedZoneId ?? 'zone-empty'"
        :payload="currentAndNextMatches"
        :selected-zone-id="selectedZoneId"
        :selected-zone-name="selectedZoneName"
        :selected-zone-live-state="selectedZone?.liveState ?? null"
        :next-expanded="nextMatchExpanded"
        :team-group-map="teamGroupMap"
        @team-select="onOpenTeamData"
        @update-next-expanded="onNextExpandedChange"
      />
    </section>

    <section class="main-grid">
      <div class="live-column">
        <LivePlayer
          :stream-url="effectiveStreamUrl"
          :loading="streamLoading"
          :error-message="effectiveStreamErrorMessage"
          @retry="retryLiveStream"
        />
      </div>
    </section>

    <section class="lower-grid">
      <div class="schedule-cell">
        <SchedulePanel
          v-if="!isMobile"
          :payload="schedule"
          :selected-zone-id="selectedZoneId"
          :team-group-map="teamGroupMap"
          @team-select="onOpenTeamData"
        />
        <MobileSchedulePanel
          v-else
          :payload="schedule"
          :selected-zone-id="selectedZoneId"
          :team-group-map="teamGroupMap"
          @team-select="onOpenTeamData"
        />
      </div>
    </section>

    <Dialog v-model:visible="dataDialogVisible" modal header="比赛数据" :style="{ width: 'min(1100px, 96vw)' }">
      <section v-if="dialogTeamGroupSection" class="group-block">
        <h3>{{ dialogTeamGroupSection.group }} 组排名</h3>
        <div class="group-list">
          <article
            v-for="item in dialogTeamGroupSection.teams"
            :key="`${dialogTeamGroupSection.group}-${item.teamName}`"
            class="group-row"
            :class="{ active: item.teamName === dataDialogTeam }"
          >
            <span class="rank">#{{ item.rank }}</span>
            <div class="meta">
              <strong>{{ item.teamName }}</strong>
              <small>{{ item.collegeName }}</small>
            </div>
            <span v-if="item.teamName === dataDialogTeam" class="current">当前查看</span>
          </article>
        </div>
      </section>

      <RobotDataPanel :payload="robotData" :selected-zone-id="selectedZoneId" :team-name="dataDialogTeam" />
    </Dialog>
  </main>
</template>

<style scoped>
:global(html),
:global(body),
:global(#app) {
  margin: 0;
  min-height: 100%;
}

:global(body) {
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background:
    radial-gradient(1200px 500px at 80% -10%, rgba(0, 112, 243, 0.22), transparent 60%),
    linear-gradient(180deg, #020617 0%, #0f172a 100%);
}

.app-shell {
  max-width: 1280px;
  margin: 0 auto;
  padding: 1rem;
  box-sizing: border-box;
  overflow-x: clip;
}

.controls-card {
  margin-bottom: 1rem;
}

.controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.zone-select,
.quality-select {
  min-width: 10rem;
}

:deep(.p-dialog) {
  max-width: calc(100vw - 1rem);
}

.main-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
  min-width: 0;
}

.match-hero {
  margin-bottom: 1rem;
}

.live-column {
  min-width: 0;
}

.lower-grid {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
  grid-template-columns: 1fr;
}

.group-block {
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 0.75rem;
  padding: 0.7rem;
  margin-bottom: 0.8rem;
}

.group-block h3 {
  margin: 0 0 0.5rem;
  font-size: 0.96rem;
}

.group-list {
  display: grid;
  gap: 0.35rem;
}

.group-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.6rem;
  align-items: center;
  padding: 0.38rem 0.5rem;
  border-radius: 0.55rem;
  background: rgba(15, 23, 42, 0.35);
}

.group-row.active {
  outline: 1px solid rgba(59, 130, 246, 0.7);
  background: rgba(59, 130, 246, 0.12);
}

.group-row .rank {
  font-weight: 700;
  font-size: 0.82rem;
}

.group-row .meta {
  min-width: 0;
}

.group-row .meta strong {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-row .meta small {
  display: block;
  opacity: 0.75;
  font-size: 0.78rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-row .current {
  font-size: 0.72rem;
  color: #93c5fd;
}

@media (max-width: 1024px) {
  .lower-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .app-shell {
    padding: 0.65rem;
  }

  .controls {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .controls > * {
    min-width: 0;
  }

  .zone-select,
  .quality-select {
    min-width: 0;
    width: 100%;
  }

  .controls :deep(.p-button) {
    width: 100%;
  }
}

@media (max-width: 520px) {
  .controls {
    grid-template-columns: 1fr;
  }
}
</style>
