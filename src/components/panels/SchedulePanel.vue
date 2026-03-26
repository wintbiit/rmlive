<script setup lang="ts">
import Card from 'primevue/card';
import Tab from 'primevue/tab';
import TabList from 'primevue/tablist';
import TabPanel from 'primevue/tabpanel';
import TabPanels from 'primevue/tabpanels';
import Tabs from 'primevue/tabs';
import { computed, ref, watch } from 'vue';
import {
  getRecentMatches,
  getScheduleRows,
  getScheduleSchoolOptions,
  getTeamNameOptions,
  getZoneNameOptions,
  isResultStatus,
} from '../../services/scheduleView';
import type { LiveGameInfo, Schedule } from '../../types/api';
import ScheduleList from './ScheduleList.vue';
import ScheduleListFilter from './ScheduleListFilter.vue';

interface TeamSelectPayload {
  teamName: string;
  zoneId?: string | null;
  zoneName?: string | null;
}

interface Props {
  payload: Schedule | null;
  liveGameInfo: LiveGameInfo | null;
  selectedZoneId: string | null;
  teamGroupMap?: Record<string, { group: string; rank: string }>;
  isMobile?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isMobile: false,
});

const emit = defineEmits<{
  teamSelect: [payload: TeamSelectPayload];
}>();

// Get all schedule rows across all zones
const rows = computed(() => getScheduleRows(props.payload, props.liveGameInfo));

// Tab selection
const activeTab = ref<'recent' | 'schedule' | 'result'>('recent');

// Filter states for schedule and result tabs
const selectedSchool = ref<string[]>([]);
const selectedTeam = ref<string[]>([]);
const selectedZone = ref<string[]>([]);

// Generate filter options
const schoolOptions = computed(() => getScheduleSchoolOptions(rows.value));
const teamOptions = computed(() => getTeamNameOptions(rows.value));
const zoneOptions = computed(() => getZoneNameOptions(rows.value));

// Compute recent matches
const recentMatches = computed(() => getRecentMatches(rows.value, props.selectedZoneId));

function applyFilters(source: typeof rows.value): typeof rows.value {
  let filtered = source;

  if (selectedSchool.value.length > 0) {
    const schoolSet = new Set(selectedSchool.value);
    filtered = filtered.filter(
      (item) => schoolSet.has(item.redTeam.collegeName) || schoolSet.has(item.blueTeam.collegeName),
    );
  }

  if (selectedTeam.value.length > 0) {
    const teamSet = new Set(selectedTeam.value);
    filtered = filtered.filter((item) => teamSet.has(item.redTeam.teamName) || teamSet.has(item.blueTeam.teamName));
  }

  if (selectedZone.value.length > 0) {
    const zoneSet = new Set(selectedZone.value);
    filtered = filtered.filter((item) => zoneSet.has(item.zoneId));
  }

  return filtered;
}

const filteredRows = computed(() => applyFilters(rows.value));

// Compute schedule rows (upcoming)
const scheduleRows = computed(() => {
  const filtered = filteredRows.value.filter((item) => !isResultStatus(item.statusRaw));

  // Sort by start time ascending
  return filtered.slice().sort((a, b) => a.startedAtTs - b.startedAtTs);
});

// Compute result rows (completed)
const resultRows = computed(() => {
  const filtered = filteredRows.value.filter((item) => isResultStatus(item.statusRaw));

  // Sort by start time descending (newest first)
  return filtered.slice().sort((a, b) => b.startedAtTs - a.startedAtTs);
});

// Watch school options and reset selection if it becomes invalid
watch(schoolOptions, (options) => {
  const validValues = new Set(options.map((option) => option.value));
  selectedSchool.value = selectedSchool.value.filter((value) => validValues.has(value));
});

// Watch team options and reset selection if it becomes invalid
watch(teamOptions, (options) => {
  const validValues = new Set(options.map((option) => option.value));
  selectedTeam.value = selectedTeam.value.filter((value) => validValues.has(value));
});

// Watch zone options and reset selection if it becomes invalid
watch(zoneOptions, (options) => {
  const validValues = new Set(options.map((option) => option.value));
  selectedZone.value = selectedZone.value.filter((value) => validValues.has(value));
});

// Auto-switch tab if current tab becomes empty
watch(
  () => [scheduleRows.value.length, resultRows.value.length, recentMatches.value.length] as const,
  ([scheduleCount, resultCount, recentCount]) => {
    if (activeTab.value === 'recent' && recentCount === 0 && (scheduleCount > 0 || resultCount > 0)) {
      activeTab.value = 'schedule';
      return;
    }

    if (activeTab.value === 'schedule' && scheduleCount === 0 && resultCount > 0) {
      activeTab.value = 'result';
      return;
    }

    if (activeTab.value === 'result' && resultCount === 0 && scheduleCount > 0) {
      activeTab.value = 'schedule';
    }
  },
  { immediate: true },
);

function onTeamSelect(payload: TeamSelectPayload) {
  emit('teamSelect', payload);
}
</script>

<template>
  <Card class="schedule-panel-card">
    <template #content>
      <Tabs v-model:value="activeTab" class="schedule-tabs">
        <TabList>
          <Tab value="recent">
            <span class="tab-label"><i class="pi pi-bolt" />近期比赛</span>
          </Tab>
          <Tab value="schedule">
            <span class="tab-label"><i class="pi pi-calendar" />赛程</span>
          </Tab>
          <Tab value="result">
            <span class="tab-label"><i class="pi pi-trophy" />赛果</span>
          </Tab>
        </TabList>

        <TabPanels>
          <!-- Recent matches tab -->
          <TabPanel value="recent">
            <ScheduleList
              :rows="recentMatches"
              :team-group-map="props.teamGroupMap"
              :compact="isMobile"
              @team-select="onTeamSelect"
            />
          </TabPanel>

          <!-- Schedule (upcoming) tab with filters -->
          <TabPanel value="schedule">
            <ScheduleListFilter
              :isMobile="isMobile"
              :schoolOptions="schoolOptions"
              :teamOptions="teamOptions"
              :zoneOptions="zoneOptions"
              v-model:selectedSchool="selectedSchool"
              v-model:selectedTeam="selectedTeam"
              v-model:selectedZone="selectedZone"
            />

            <ScheduleList
              :rows="scheduleRows"
              :team-group-map="props.teamGroupMap"
              :compact="isMobile"
              date-order="asc"
              @team-select="onTeamSelect"
            />
          </TabPanel>

          <!-- Result (completed) tab with filters -->
          <TabPanel value="result">
            <ScheduleListFilter
              :isMobile="isMobile"
              :schoolOptions="schoolOptions"
              :teamOptions="teamOptions"
              :zoneOptions="zoneOptions"
              v-model:selectedSchool="selectedSchool"
              v-model:selectedTeam="selectedTeam"
              v-model:selectedZone="selectedZone"
            />

            <ScheduleList
              :rows="resultRows"
              :team-group-map="props.teamGroupMap"
              :compact="isMobile"
              date-order="desc"
              @team-select="onTeamSelect"
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </template>
  </Card>
</template>

<style scoped>
.card-title {
  font-weight: 500;
}

.schedule-tabs {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.schedule-panel-card {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.95rem;
}

.tab-label .pi {
  font-size: 0.75rem;
}

@media (max-width: 768px) {
  .tab-label {
    font-size: 0.85rem;
  }
}
</style>
