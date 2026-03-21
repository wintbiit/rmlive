import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { buildTeamGroupMap, extractGroupSections } from '../services/groupView';
import {
  extractLiveZones,
  fetchLiveGameInfo,
  pickDefaultZoneId,
  resolveLiveStreamUrl,
  startRmPolling,
  type RmPollingController,
} from '../services/rmApi';
import type { CurrentAndNextMatches, GroupsOrder, LiveGameInfo, RobotData, Schedule } from '../types/api';

export const useRmDataStore = defineStore('rm-data', () => {
  const liveGameInfo = ref<LiveGameInfo | null>(null);
  const currentAndNextMatches = ref<CurrentAndNextMatches | null>(null);
  const groupsOrder = ref<GroupsOrder | null>(null);
  const robotData = ref<RobotData | null>(null);
  const schedule = ref<Schedule | null>(null);

  const selectedZoneId = ref<string | null>(null);
  const selectedQualityRes = ref<string | null>(null);

  const streamLoading = ref(true);
  const streamErrorMessage = ref('');
  const lastError = ref('');
  const lastUpdated = ref('-');

  let pollingController: RmPollingController | null = null;

  const liveZones = computed(() => extractLiveZones(liveGameInfo.value));
  const selectedZone = computed(() => {
    if (!liveZones.value.length) {
      return null;
    }

    return liveZones.value.find((zone) => zone.zoneId === selectedZoneId.value) ?? liveZones.value[0];
  });
  const selectedZoneName = computed(() => selectedZone.value?.zoneName ?? null);

  const zoneOptions = computed(() => {
    return liveZones.value.map((item) => ({
      label: item.liveState === 1 ? item.zoneName : `${item.zoneName}（未直播）`,
      value: item.zoneId,
    }));
  });

  const qualityOptions = computed(() => {
    if (!selectedZone.value) {
      return [];
    }

    return selectedZone.value.qualities.map((item) => ({
      label: item.label,
      value: item.res,
    }));
  });

  const streamUrl = computed(() =>
    resolveLiveStreamUrl(liveGameInfo.value, selectedZoneId.value, selectedQualityRes.value),
  );
  const canPlaySelectedZone = computed(() => (selectedZone.value?.liveState ?? 0) === 1);
  const effectiveStreamUrl = computed(() => (canPlaySelectedZone.value ? streamUrl.value : null));
  const effectiveStreamErrorMessage = computed(() => {
    if (!canPlaySelectedZone.value && selectedZone.value) {
      return `${selectedZone.value.zoneName} 当前未直播，请切换到直播中的站点`;
    }
    return streamErrorMessage.value;
  });
  const hasError = computed(() => lastError.value.length > 0);

  const groupSections = computed(() =>
    extractGroupSections(groupsOrder.value, selectedZoneId.value, selectedZoneName.value),
  );
  const teamGroupMap = computed(() => buildTeamGroupMap(groupSections.value));

  function updateTimestamp() {
    lastUpdated.value = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  }

  function ensureZoneSelection() {
    const zones = liveZones.value;
    if (!zones.length) {
      selectedZoneId.value = null;
      selectedQualityRes.value = null;
      return;
    }

    const hasZone = zones.some((item) => item.zoneId === selectedZoneId.value);
    if (!hasZone) {
      selectedZoneId.value = pickDefaultZoneId(zones);
    }
  }

  function ensureQualitySelection() {
    const zone = selectedZone.value;
    if (!zone) {
      selectedQualityRes.value = null;
      return;
    }

    const hasQuality = zone.qualities.some((item) => item.res === selectedQualityRes.value);
    if (!hasQuality) {
      selectedQualityRes.value = zone.qualities[0]?.res ?? null;
    }
  }

  function setZone(value: string | null) {
    selectedZoneId.value = value;
    ensureQualitySelection();
  }

  function setQuality(value: string | null) {
    selectedQualityRes.value = value;
  }

  function stopPolling() {
    pollingController?.stopAll();
    pollingController = null;
  }

  function startPolling() {
    stopPolling();
    pollingController = startRmPolling({
      onLiveGameInfo(data) {
        liveGameInfo.value = data;
        ensureZoneSelection();
        ensureQualitySelection();
        streamLoading.value = false;
        streamErrorMessage.value = '';
        lastError.value = '';
        updateTimestamp();
      },
      onCurrentAndNextMatches(data) {
        currentAndNextMatches.value = data;
        lastError.value = '';
        updateTimestamp();
      },
      onGroupsOrder(data) {
        groupsOrder.value = data;
        lastError.value = '';
        updateTimestamp();
      },
      onRobotData(data) {
        robotData.value = data;
        lastError.value = '';
        updateTimestamp();
      },
      onSchedule(data) {
        schedule.value = data;
        lastError.value = '';
        updateTimestamp();
      },
      onError() {
        lastError.value = '部分接口请求失败，正在自动重试';
        streamLoading.value = false;
        if (!streamUrl.value) {
          streamErrorMessage.value = '直播流暂时不可用，请稍后重试';
        }
      },
    });
  }

  async function retryLiveStream() {
    streamErrorMessage.value = '';
    streamLoading.value = true;

    try {
      liveGameInfo.value = await fetchLiveGameInfo();
      ensureZoneSelection();
      ensureQualitySelection();
      updateTimestamp();
    } catch {
      streamErrorMessage.value = '直播流请求失败，请检查网络后重试';
    } finally {
      streamLoading.value = false;
    }
  }

  return {
    liveGameInfo,
    currentAndNextMatches,
    groupsOrder,
    robotData,
    schedule,
    selectedZoneId,
    selectedQualityRes,
    streamLoading,
    streamErrorMessage,
    lastError,
    lastUpdated,
    liveZones,
    selectedZone,
    selectedZoneName,
    zoneOptions,
    qualityOptions,
    streamUrl,
    effectiveStreamUrl,
    effectiveStreamErrorMessage,
    hasError,
    groupSections,
    teamGroupMap,
    setZone,
    setQuality,
    startPolling,
    stopPolling,
    retryLiveStream,
  };
});
