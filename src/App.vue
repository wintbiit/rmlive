<script setup lang="ts">
import { storeToRefs } from 'pinia';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import Select from 'primevue/select';
import SelectButton from 'primevue/selectbutton';
import Skeleton from 'primevue/skeleton';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import Tag from 'primevue/tag';
import Toast from 'primevue/toast';
import ToggleButton from 'primevue/togglebutton';
import Toolbar from 'primevue/toolbar';
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import CurrentMatchPanel from './components/panels/CurrentMatchPanel.vue';
import { resolveGroupRankSectionByGroup, resolveGroupRankSectionByTeam } from './services/groupRankView';
import { buildImageUrl } from './services/urlProxy';
import { useDanmuStore } from './stores/danmu';
import { useRmDataStore } from './stores/rmData';
import { useUiStore } from './stores/ui';
import type { DanmuMessage } from './types/api';

const LivePlayer = defineAsyncComponent(() => import('./components/live/LivePlayer.vue'));
const DanmuPanel = defineAsyncComponent(() => import('./components/danmu/DanmuPanel.vue'));
const SchedulePanel = defineAsyncComponent(() => import('./components/panels/SchedulePanel.vue'));
const MobileSchedulePanel = defineAsyncComponent(() => import('./components/panels/MobileSchedulePanel.vue'));
const RobotDataPanel = defineAsyncComponent(() => import('./components/panels/RobotDataPanel.vue'));

const dataStore = useRmDataStore();
const danmuStore = useDanmuStore();
const uiStore = useUiStore();

const {
  currentAndNextMatches,
  robotData,
  schedule,
  groupRankInfo,
  selectedZone,
  selectedZoneId,
  selectedQualityRes,
  streamLoading,
  effectiveStreamUrl,
  effectiveStreamErrorMessage,
  selectedZoneName,
  zoneOptions,
  teamGroupMap,
  groupSections,
  liveGameInfo,
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

const dialogTeamRows = computed(() => {
  const section = dialogTeamGroupSection.value;
  if (!section) {
    return [];
  }

  return section.teams.map((team, index) => ({
    rank: Number(team.rank) || index + 1,
    teamName: team.teamName,
    collegeName: team.collegeName,
    isCurrent: team.teamName === dataDialogTeam.value,
  }));
});

const dialogRankSection = computed(() => {
  const byGroup = resolveGroupRankSectionByGroup(
    groupRankInfo.value,
    selectedZoneId.value,
    selectedZoneName.value,
    dialogTeamGroupSection.value?.group ?? null,
  );

  if (byGroup) {
    return byGroup;
  }

  return resolveGroupRankSectionByTeam(
    groupRankInfo.value,
    selectedZoneId.value,
    selectedZoneName.value,
    dataDialogTeam.value,
  );
});

const dialogRankRows = computed(() => {
  const section = dialogRankSection.value;
  if (!section) {
    return dialogTeamRows.value.map((item) => ({
      rank: Number(item.rank) || 0,
      teamName: item.teamName,
      collegeName: item.collegeName,
      collegeLogo: '',
      winDrawLose: '-',
      points: 0,
      netVictoryPoint: 0,
      totalDamage: 0,
      totalRemainHp: 0,
      isCurrent: item.isCurrent,
      isFallback: true,
    }));
  }

  return section.rows.map((item) => ({
    ...item,
    isCurrent: item.teamName === dataDialogTeam.value,
    isFallback: false,
  }));
});

const sortedDialogRankRows = computed(() => {
  const rows = [...dialogRankRows.value].sort((a, b) => {
    if (a.isFallback && b.isFallback) {
      return a.rank - b.rank;
    }

    if (b.points !== a.points) {
      return b.points - a.points;
    }

    if (b.netVictoryPoint !== a.netVictoryPoint) {
      return b.netVictoryPoint - a.netVictoryPoint;
    }

    return a.rank - b.rank;
  });

  return rows.map((row, index) => ({
    ...row,
    rankDisplay: row.rank > 0 ? row.rank : index + 1,
  }));
});

const hasGroupRankSection = computed(() => {
  return Boolean(dialogRankSection.value || dialogTeamGroupSection.value);
});

const rankSectionTitle = computed(() => {
  return dialogRankSection.value?.groupName ?? dialogTeamGroupSection.value?.group ?? '当前组';
});

const compactRankRows = computed(() => {
  return sortedDialogRankRows.value.slice(0, 8);
});

const playerQualityOptions = computed(() => {
  const zone = selectedZone.value;
  if (!zone) {
    return [];
  }

  return zone.qualities.map((item) => ({
    label: item.label,
    value: item.res,
    src: item.src,
  }));
});

const selectedZoneChatRoomId = computed(() => {
  const rawZoneId = String(selectedZoneId.value ?? '').trim();
  const eventData = liveGameInfo.value?.eventData;
  if (!rawZoneId || !Array.isArray(eventData)) {
    return null;
  }

  const normalizeZoneId = (value: unknown) => {
    const id = String(value ?? '').trim();
    if (!id) {
      return '';
    }
    const numeric = Number(id);
    return Number.isFinite(numeric) ? String(numeric) : id;
  };

  const targetZoneId = normalizeZoneId(rawZoneId);
  const matched = eventData.find((item) => {
    const zone = item as Record<string, unknown>;
    return normalizeZoneId(zone.zoneId) === targetZoneId;
  }) as Record<string, unknown> | undefined;

  const byMatchedZone = matched?.chatRoomId;
  if (typeof byMatchedZone === 'string' && byMatchedZone.trim()) {
    return byMatchedZone;
  }

  const selectedZoneNameValue = selectedZoneName.value;
  if (selectedZoneNameValue) {
    const byName = eventData.find((item) => {
      const zone = item as Record<string, unknown>;
      const zoneName = String(zone.zoneName ?? '').trim();
      return zoneName === selectedZoneNameValue || zoneName.includes(selectedZoneNameValue);
    }) as Record<string, unknown> | undefined;

    const chatRoomId = byName?.chatRoomId;
    if (typeof chatRoomId === 'string' && chatRoomId.trim()) {
      return chatRoomId;
    }
  }

  const fallback = eventData.find((item) => {
    const zone = item as Record<string, unknown>;
    return typeof zone.chatRoomId === 'string' && zone.chatRoomId.trim().length > 0;
  }) as Record<string, unknown> | undefined;

  const fallbackChatRoomId = fallback?.chatRoomId;
  if (typeof fallbackChatRoomId === 'string' && fallbackChatRoomId.trim()) {
    return fallbackChatRoomId;
  }

  return null;
});

function showZoneDate(option: { state: string; dateText: string }): boolean {
  return (option.state === 'upcoming' || option.state === 'ended') && option.dateText !== '-';
}

const currentZoneOption = computed(() => {
  return zoneOptions.value.find((item) => String(item.value) === String(selectedZoneId.value ?? '')) ?? null;
});

function onDanmuReceived(msg: DanmuMessage) {
  danmuStore.pushMessage(msg);
}

watch(
  () => selectedZoneChatRoomId.value,
  () => {
    danmuStore.resetMessages();
  },
);

const onZoneChange = dataStore.setZone;
const retryLiveStream = dataStore.retryLiveStream;

const onOpenTeamData = uiStore.openTeamData;
const onNextExpandedChange = uiStore.setNextMatchExpanded;
const brandLogoUrl = `${import.meta.env.BASE_URL}rmlive-logo.svg`;
const enableSecondaryPanels = ref(false);

const themeChecked = computed({
  get: () => isDark.value,
  set: (value: boolean) => uiStore.setDarkMode(value),
});

const rankTableWrapRef = ref<HTMLElement | null>(null);

let deferTimer: number | null = null;

function mountSecondaryPanels() {
  enableSecondaryPanels.value = true;
}

function scheduleSecondaryPanelsMount() {
  const idleCallback = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
  if (idleCallback) {
    idleCallback(() => mountSecondaryPanels());
    return;
  }

  deferTimer = window.setTimeout(() => mountSecondaryPanels(), 180);
}

function rankRowClass(data: { isCurrent?: boolean }) {
  return data.isCurrent ? 'is-current-row' : '';
}

function scrollToCurrentRankRow() {
  if (!dataDialogVisible.value) {
    return;
  }

  const wrap = rankTableWrapRef.value;
  if (!wrap) {
    return;
  }

  const row = wrap.querySelector('.rank-row.is-current-row') as HTMLElement | null;
  row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

watch([dataDialogVisible, dataDialogTeam, sortedDialogRankRows], () => {
  void nextTick(() => scrollToCurrentRankRow());
});

onMounted(() => {
  uiStore.initializeUi();
  dataStore.startPolling();
  scheduleSecondaryPanelsMount();
});

onBeforeUnmount(() => {
  if (deferTimer !== null) {
    window.clearTimeout(deferTimer);
  }
  uiStore.teardownUi();
  dataStore.stopPolling();
});
</script>

<template>
  <main class="app-shell">
    <Toast position="top-right" />
    <Toolbar class="top-toolbar">
      <template #start>
        <div class="toolbar-brand">
          <img :src="brandLogoUrl" alt="RMLive logo" class="brand-logo" />
          <div class="toolbar-brand-meta">
            <h1>RMLive - Better 直播间</h1>
            <p>更清晰的赛事视图，更顺滑的直播体验</p>
          </div>
        </div>
      </template>

      <template #end>
        <div class="toolbar-actions">
          <SelectButton
            v-if="!isMobile"
            class="zone-select-button-wrap"
            :model-value="selectedZoneId"
            :options="zoneOptions"
            optionLabel="label"
            optionValue="value"
            optionDisabled="disabled"
            fluid
            size="small"
            @update:model-value="onZoneChange"
          >
            <template #option="slotProps">
              <div class="zone-option-content">
                <span v-if="slotProps.option.liveLogo" class="zone-live-prefix" aria-hidden="true">
                  <i class="pi pi-video" />
                </span>
                <span class="zone-option-text">
                  <span class="zone-name">{{ slotProps.option.title }}</span>
                  <span v-if="showZoneDate(slotProps.option)" class="zone-date">{{ slotProps.option.dateText }}</span>
                </span>
              </div>
            </template>
          </SelectButton>
          <Select
            v-else
            class="zone-select"
            :model-value="selectedZoneId"
            :options="zoneOptions"
            optionLabel="label"
            optionValue="value"
            optionDisabled="disabled"
            size="small"
            placeholder="站点"
            @update:model-value="onZoneChange"
          >
            <template #value="slotProps">
              <div v-if="currentZoneOption" class="zone-option-content">
                <span v-if="currentZoneOption.liveLogo" class="zone-live-prefix" aria-hidden="true">
                  <i class="pi pi-video" />
                </span>
                <span class="zone-option-text">
                  <span class="zone-name">{{ currentZoneOption.title }}</span>
                  <span v-if="showZoneDate(currentZoneOption)" class="zone-date">{{ currentZoneOption.dateText }}</span>
                </span>
              </div>
              <span v-else>{{ slotProps.placeholder || '站点' }}</span>
            </template>
            <template #option="slotProps">
              <div class="zone-option-content">
                <span v-if="slotProps.option.liveLogo" class="zone-live-prefix" aria-hidden="true">
                  <i class="pi pi-video" />
                </span>
                <span class="zone-option-text">
                  <span class="zone-name">{{ slotProps.option.title }}</span>
                  <span v-if="showZoneDate(slotProps.option)" class="zone-date">{{ slotProps.option.dateText }}</span>
                </span>
              </div>
            </template>
          </Select>

          <ToggleButton
            v-model="themeChecked"
            on-icon="pi pi-moon"
            off-icon="pi pi-sun"
            on-label=""
            off-label=""
            size="small"
            aria-label="主题切换"
          />
        </div>
      </template>
    </Toolbar>

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
      <!-- PC version with danmu panel on right -->
      <Splitter v-if="!isMobile" layout="horizontal" :style="{ height: '100%' }">
        <SplitterPanel :size="75" :minSize="50">
          <div class="live-column">
            <LivePlayer
              :stream-url="effectiveStreamUrl"
              :loading="streamLoading"
              :error-message="effectiveStreamErrorMessage"
              :quality-options="playerQualityOptions"
              :selected-quality-res="selectedQualityRes"
              :chat-room-id="selectedZoneChatRoomId"
              @retry="retryLiveStream"
              @danmu="onDanmuReceived"
            />
          </div>
        </SplitterPanel>

        <!-- Right danmu panel (PC only) -->
        <SplitterPanel :size="25" :minSize="20" class="danmu-panel-wrap">
          <DanmuPanel />
        </SplitterPanel>
      </Splitter>

      <!-- Mobile version without danmu panel -->
      <div v-else class="live-column">
        <LivePlayer
          :stream-url="effectiveStreamUrl"
          :loading="streamLoading"
          :error-message="effectiveStreamErrorMessage"
          :quality-options="playerQualityOptions"
          :selected-quality-res="selectedQualityRes"
          :chat-room-id="selectedZoneChatRoomId"
          @retry="retryLiveStream"
          @danmu="onDanmuReceived"
        />
      </div>
    </section>

    <section class="lower-grid">
      <div v-if="enableSecondaryPanels" class="schedule-cell">
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
      <div v-else class="schedule-placeholder">
        <Skeleton width="100%" height="18rem" borderRadius="12px" />
      </div>
    </section>

    <Dialog v-model:visible="dataDialogVisible" modal header="比赛数据" :style="{ width: 'min(1100px, 96vw)' }">
      <section v-if="hasGroupRankSection" class="group-block">
        <h3>{{ rankSectionTitle }} 组排名</h3>
        <div ref="rankTableWrapRef" class="group-rank-table-wrap" v-if="compactRankRows.length">
          <article
            v-for="row in compactRankRows"
            :key="`${rankSectionTitle}-${row.teamName}-${row.rankDisplay}`"
            class="rank-row"
            :class="{ 'is-current-row': row.isCurrent }"
            role="button"
            tabindex="0"
            @click="onOpenTeamData(row.teamName)"
            @keydown.enter.prevent="onOpenTeamData(row.teamName)"
            @keydown.space.prevent="onOpenTeamData(row.teamName)"
          >
            <div class="rank-main">
              <Tag :value="`#${row.rankDisplay}`" :severity="row.isCurrent ? 'info' : 'contrast'" />
              <img
                v-if="row.collegeLogo"
                class="rank-team-logo"
                :src="buildImageUrl(row.collegeLogo)"
                :alt="`${row.teamName} logo`"
              />
              <div class="rank-meta">
                <strong>{{ row.teamName }}</strong>
                <small>{{ row.collegeName }}</small>
              </div>
              <Tag v-if="row.isCurrent" value="当前查看" severity="info" />
            </div>

            <div class="rank-metrics">
              <Tag :value="`胜平负 ${row.winDrawLose}`" severity="secondary" />
              <Tag :value="`积分 ${row.points}`" severity="secondary" />
              <Tag :value="`净胜 ${row.netVictoryPoint}`" severity="secondary" />
            </div>
          </article>
        </div>
        <Message v-else severity="warn" :closable="false" class="rank-empty-tip">
          当前组暂无可展示的详细排名数据
        </Message>
      </section>
      <Message v-else severity="warn" :closable="false">未匹配到当前队伍对应的小组排名数据</Message>

      <RobotDataPanel
        v-if="dataDialogVisible"
        :payload="robotData"
        :selected-zone-id="selectedZoneId"
        :team-name="dataDialogTeam"
      />
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

:global(:root) {
  /* 记分板主题颜色 */
  --scoreboard-bg-light: linear-gradient(135deg, rgba(219, 234, 254, 0.45), rgba(191, 219, 254, 0.35));
  --scoreboard-bg-dark: linear-gradient(135deg, rgb(2 6 23 / 0.72), rgb(30 58 138 / 0.34));
  --scoreboard-border: rgb(148, 163, 184, 0.25);
  --scoreboard-box-shadow: inset 0 1px 0 rgba(191, 219, 254, 0.15);
  --score-side-bg-light: rgba(226, 232, 240, 0.48);
  --score-side-bg-dark: rgb(15 23 42 / 0.42);
  --score-side-red-border: rgb(248 113 113 / 0.35);
  --score-side-blue-border: rgb(96 165 250 / 0.35);
}

:global(html.app-dark) {
  /* 记分板主题颜色 */
  --scoreboard-bg-light: linear-gradient(135deg, rgb(2 6 23 / 0.72), rgb(30 58 138 / 0.34));
  --scoreboard-bg-dark: linear-gradient(135deg, rgb(2 6 23 / 0.72), rgb(30 58 138 / 0.34));
  --scoreboard-border: rgb(96 165 250 / 0.35);
  --scoreboard-box-shadow: inset 0 1px 0 rgb(191 219 254 / 0.22);
  --score-side-bg-light: rgb(15 23 42 / 0.42);
  --score-side-bg-dark: rgb(15 23 42 / 0.42);
  --score-side-red-border: rgb(248 113 113 / 0.4);
  --score-side-blue-border: rgb(96 165 250 / 0.4);
}

.app-shell {
  max-width: 1280px;
  margin: 0 auto;
  padding: 1rem;
  box-sizing: border-box;
  overflow-x: clip;
}

.top-toolbar {
  margin-bottom: 1rem;
}

.toolbar-brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.brand-logo {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.toolbar-brand-meta h1 {
  margin: 0;
  font-size: 1.02rem;
  line-height: 1.15;
}

.toolbar-brand-meta p {
  margin: 0.18rem 0 0;
  font-size: 0.78rem;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.zone-select {
  min-width: 9rem;
}

.zone-select-button-wrap {
  flex: 1;
  min-width: 0;
}

.zone-option-content {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}

.zone-live-prefix {
  width: 1.05rem;
  height: 1.05rem;
  border-radius: 999px;
  background: color-mix(in srgb, #ef4444 22%, transparent);
  color: #ef4444;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.zone-live-prefix .pi {
  font-size: 0.6rem;
}

.zone-option-text {
  min-width: 0;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.1;
}

.zone-name {
  white-space: nowrap;
}

.zone-date {
  font-size: 0.65rem;
  opacity: 0.74;
  white-space: nowrap;
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

.schedule-placeholder {
  opacity: 0.6;
}

.group-block {
  margin-bottom: 0.8rem;
}

.group-block h3 {
  margin: 0 0 0.5rem;
  font-size: 0.96rem;
}

.rank-empty-tip {
  margin-top: 0.55rem;
}

.group-rank-table-wrap {
  overflow: auto;
  max-height: 20rem;
  display: grid;
  gap: 0.45rem;
}

.rank-row {
  padding: 0.4rem 0;
  cursor: pointer;
  border-radius: 0.55rem;
}

.rank-row.is-current-row {
  background: color-mix(in srgb, var(--p-primary-500) 14%, transparent);
  outline: 1px solid color-mix(in srgb, var(--p-primary-500) 38%, transparent);
  padding: 0.4rem 0.45rem;
}

.rank-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rank-team-logo {
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 999px;
  object-fit: cover;
  flex-shrink: 0;
}

.rank-meta {
  min-width: 0;
  flex: 1;
}

.rank-meta strong {
  display: block;
  line-height: 1.15;
}

.rank-meta small {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.danmu-panel-wrap {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@media (max-width: 1024px) {
  .lower-grid {
    grid-template-columns: 1fr;
  }

  .danmu-panel-wrap {
    display: none;
  }
}

@media (max-width: 768px) {
  .app-shell {
    padding: 0.65rem;
  }

  .brand-logo {
    width: 34px;
    height: 34px;
  }

  .toolbar-brand-meta h1 {
    font-size: 0.92rem;
  }

  .toolbar-brand-meta p {
    display: none;
  }

  .toolbar-actions {
    gap: 0.35rem;
  }

  .zone-select {
    min-width: 0;
    flex: 1;
  }

  .zone-select-button-wrap {
    min-width: 0;
  }
}
</style>
