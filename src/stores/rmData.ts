import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { buildTeamGroupMap, extractGroupSections } from '../services/groupView';
import {
  extractLiveZones,
  fetchCurrentAndNextMatches,
  fetchGroupRankInfo,
  fetchGroupsOrder,
  fetchLiveGameInfo,
  fetchRobotData,
  fetchSchedule,
  pickDefaultZoneId,
  resolveLiveStreamUrl,
  startRmPolling,
  type RmPollingController,
} from '../services/rmApi';
import type {
  CurrentAndNextMatches,
  GroupRankInfo,
  GroupsOrder,
  LiveGameInfo,
  RobotData,
  Schedule,
} from '../types/api';

type ZoneUiState = 'live' | 'offline' | 'upcoming' | 'ended';

interface ZoneOptionItem {
  label: string;
  value: string;
  state: ZoneUiState;
  icon: string;
  liveLogo: boolean;
  title: string;
  dateText: string;
  disabled: boolean;
}

export const useRmDataStore = defineStore('rm-data', () => {
  const liveGameInfo = ref<LiveGameInfo | null>(null);
  const currentAndNextMatches = ref<CurrentAndNextMatches | null>(null);
  const groupsOrder = ref<GroupsOrder | null>(null);
  const groupRankInfo = ref<GroupRankInfo | null>(null);
  const robotData = ref<RobotData | null>(null);
  const schedule = ref<Schedule | null>(null);

  const selectedZoneId = ref<string | null>(null);
  const selectedQualityRes = ref<string | null>(null);
  const hasManualZoneSelection = ref(false);

  const streamLoading = ref(true);
  const streamErrorMessage = ref('');

  let pollingController: RmPollingController | null = null;
  let bootstrapSeq = 0;

  const liveZones = computed(() => extractLiveZones(liveGameInfo.value));
  const selectedZone = computed(() => {
    if (!liveZones.value.length) {
      return null;
    }

    const targetId = normalizeZoneId(selectedZoneId.value);
    return liveZones.value.find((zone) => normalizeZoneId(zone.zoneId) === targetId) ?? liveZones.value[0];
  });
  const selectedZoneName = computed(() => selectedZone.value?.zoneName ?? null);

  function normalizeZoneId(value: unknown): string {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return '';
    }

    const numeric = Number(raw);
    if (Number.isFinite(numeric)) {
      return String(numeric);
    }

    return raw;
  }

  const inferredLiveZoneIdSet = computed(() => {
    const payload = currentAndNextMatches.value;
    if (!payload) {
      return new Set<string>();
    }

    const buckets = Array.isArray(payload)
      ? payload
      : (((payload as Record<string, unknown>).data ??
          (payload as Record<string, unknown>).list ??
          (payload as Record<string, unknown>).records ??
          []) as unknown[]);

    const liveStatuses = new Set(['STARTED', 'RUNNING', 'IN_PROGRESS', 'ONGOING', 'PLAYING']);
    const ids = new Set<string>();

    for (const rawItem of buckets) {
      if (!rawItem || typeof rawItem !== 'object') {
        continue;
      }

      const item = rawItem as Record<string, unknown>;
      const currentMatch = item.currentMatch as Record<string, unknown> | undefined;
      const status = String(currentMatch?.status ?? '')
        .trim()
        .toUpperCase();

      if (!liveStatuses.has(status)) {
        continue;
      }

      const zone =
        (currentMatch?.zone as Record<string, unknown> | undefined) ??
        (item.zone as Record<string, unknown> | undefined) ??
        undefined;
      const id = normalizeZoneId(zone?.id ?? zone?.zoneId ?? item.zoneId);
      if (id) {
        ids.add(id);
      }
    }

    return ids;
  });

  const scheduleZoneIdSet = computed(() => {
    const payload = schedule.value;
    if (!payload || typeof payload !== 'object') {
      return new Set<string>();
    }

    const root = payload as Record<string, unknown>;
    const fromGraph = (
      ((root.data as Record<string, unknown> | undefined)?.event as Record<string, unknown> | undefined)?.zones as
        | Record<string, unknown>
        | undefined
    )?.nodes;
    const fromCurrentEvent = ((
      (root.current_event as Record<string, unknown> | undefined)?.zones as Record<string, unknown> | undefined
    )?.nodes ??
      ((root.currentEvent as Record<string, unknown> | undefined)?.zones as Record<string, unknown> | undefined)
        ?.nodes) as unknown;

    const zones = Array.isArray(fromGraph)
      ? (fromGraph as Record<string, unknown>[])
      : Array.isArray(fromCurrentEvent)
        ? (fromCurrentEvent as Record<string, unknown>[])
        : [];

    const ids = new Set<string>();
    zones.forEach((item) => {
      const id = normalizeZoneId((item as Record<string, unknown>).id);
      if (id) {
        ids.add(id);
      }
    });

    return ids;
  });

  function formatDate(value: number | null): string {
    if (!value) {
      return '-';
    }

    const ms = value > 10_000_000_000 ? value : value * 1000;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) {
      return '-';
    }

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function resolveZoneUiState(zone: (typeof liveZones.value)[number], nowEpoch: number): ZoneUiState {
    if (zone.liveState === 1) {
      return 'live';
    }

    // 如果有schedule时间表信息，用来判断是otherwise还是ended
    if (zone.startAt && nowEpoch < zone.startAt) {
      return 'upcoming';
    }

    if (zone.endAt && nowEpoch > zone.endAt) {
      return 'ended';
    }

    return 'offline';
  }

  const zoneOptions = computed<ZoneOptionItem[]>(() => {
    const nowEpoch = Math.floor(Date.now() / 1000);

    return liveZones.value.map((item) => {
      const state = resolveZoneUiState(item, nowEpoch);

      if (state === 'live') {
        return {
          label: item.zoneName,
          value: item.zoneId,
          state,
          icon: 'pi pi-video',
          liveLogo: true,
          title: item.zoneName,
          dateText: '',
          disabled: false,
        };
      }

      if (state === 'offline') {
        return {
          label: item.zoneName,
          value: item.zoneId,
          state,
          icon: 'pi pi-video-off',
          liveLogo: false,
          title: item.zoneName,
          dateText: '',
          disabled: false,
        };
      }

      if (state === 'upcoming') {
        const dateText = formatDate(item.startAt);
        return {
          label: item.zoneName,
          value: item.zoneId,
          state,
          icon: 'pi pi-clock',
          liveLogo: false,
          title: item.zoneName,
          dateText,
          disabled: true,
        };
      }

      const dateText = formatDate(item.endAt);
      return {
        label: item.zoneName,
        value: item.zoneId,
        state,
        icon: 'pi pi-check-circle',
        liveLogo: false,
        title: item.zoneName,
        dateText,
        disabled: true,
      };
    });
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
  const selectedZoneUiState = computed<ZoneUiState | null>(() => {
    const zone = selectedZone.value;
    if (!zone) {
      return null;
    }
    return resolveZoneUiState(zone, Math.floor(Date.now() / 1000));
  });
  const canPlaySelectedZone = computed(() => {
    const zone = selectedZone.value;
    if (!zone || zone.qualities.length === 0) {
      return false;
    }

    // 只有当 liveState === 1 或在实时推断集合中时才能播放
    return zone.liveState === 1 || inferredLiveZoneIdSet.value.has(normalizeZoneId(zone.zoneId));
  });
  const effectiveStreamUrl = computed(() => (canPlaySelectedZone.value ? streamUrl.value : null));
  const effectiveStreamErrorMessage = computed(() => {
    const zone = selectedZone.value;

    // 兜底逻辑：如果无法播放且有zone被选中，显示zone相关的提示
    if (!canPlaySelectedZone.value && zone) {
      const state = selectedZoneUiState.value;

      if (state === 'upcoming') {
        return `${zone.zoneName} 尚未开播`;
      }

      if (state === 'ended') {
        return `${zone.zoneName} 已完赛`;
      }

      // 其他无法播放的情况（offline或流不可用）
      return `${zone.zoneName} 暂无可用直播流`;
    }

    // 返回通用错误信息
    return streamErrorMessage.value;
  });

  const groupSections = computed(() =>
    extractGroupSections(groupsOrder.value, selectedZoneId.value, selectedZoneName.value),
  );
  const teamGroupMap = computed(() => buildTeamGroupMap(groupSections.value));

  function ensureZoneSelection() {
    const options = zoneOptions.value;
    if (!options.length) {
      selectedZoneId.value = null;
      selectedQualityRes.value = null;
      return;
    }

    const enabledOptions = options.filter((item) => !item.disabled);
    const liveFromMatches = enabledOptions.find((item) => inferredLiveZoneIdSet.value.has(normalizeZoneId(item.value)));

    const currentSelected = normalizeZoneId(selectedZoneId.value);
    const currentOption = enabledOptions.find((item) => normalizeZoneId(item.value) === currentSelected) ?? null;

    const zones = liveZones.value;
    const preferred = pickDefaultZoneId(zones);
    const withPlayableStream = enabledOptions.find((item) => {
      const zone = zones.find((z) => normalizeZoneId(z.zoneId) === normalizeZoneId(item.value));
      return Boolean(zone?.qualities?.[0]?.src);
    });
    const preferredEnabled = preferred
      ? enabledOptions.find((item) => normalizeZoneId(item.value) === normalizeZoneId(preferred))
      : null;
    const withSchedule = enabledOptions.find((item) => scheduleZoneIdSet.value.has(normalizeZoneId(item.value)));
    const fallbackEnabled = enabledOptions[0] ?? null;
    const bestCandidate =
      liveFromMatches?.value ??
      withPlayableStream?.value ??
      preferredEnabled?.value ??
      withSchedule?.value ??
      fallbackEnabled?.value ??
      options[0].value;

    if (!currentOption) {
      selectedZoneId.value = bestCandidate;
      return;
    }

    // 用户未手动切站点前，允许在首屏数据陆续到达时自动提升到更优站点。
    if (!hasManualZoneSelection.value) {
      const currentIsLive = inferredLiveZoneIdSet.value.has(normalizeZoneId(currentOption.value));
      const shouldPromoteToLive = Boolean(liveFromMatches && !currentIsLive);
      const currentZone = zones.find((z) => normalizeZoneId(z.zoneId) === normalizeZoneId(currentOption.value));
      const currentHasPlayableStream = Boolean(currentZone?.qualities?.[0]?.src);
      const shouldPromoteToPlayable = !currentHasPlayableStream && Boolean(withPlayableStream);

      if (shouldPromoteToLive || shouldPromoteToPlayable) {
        selectedZoneId.value = bestCandidate;
      }
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
    const target = zoneOptions.value.find((item) => item.value === value);
    if (target?.disabled) {
      return;
    }

    hasManualZoneSelection.value = true;
    selectedZoneId.value = value;
    ensureQualitySelection();
  }

  function setQuality(value: string | null) {
    selectedQualityRes.value = value;
  }

  watch(
    liveZones,
    () => {
      ensureZoneSelection();
      ensureQualitySelection();
    },
    { immediate: true },
  );

  function stopPolling() {
    bootstrapSeq += 1;
    pollingController?.stopAll();
    pollingController = null;
  }

  function startPolling() {
    stopPolling();
    hasManualZoneSelection.value = false;
    streamLoading.value = true;
    streamErrorMessage.value = '';

    const seq = ++bootstrapSeq;

    void (async () => {
      const startTime = Date.now();
      const TOTAL_BOOTSTRAP_TIMEOUT_MS = 15000; // 整个bootstrap最多15秒
      const PER_REQUEST_TIMEOUT_MS = 8000; // 每个单独请求最多8秒

      function withBootstrapTimeout<T>(promise: Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
          const elapsedTime = Date.now() - startTime;
          const remainingTime = Math.max(1000, TOTAL_BOOTSTRAP_TIMEOUT_MS - elapsedTime); // 至少留1秒
          const timeout = Math.min(PER_REQUEST_TIMEOUT_MS, remainingTime);

          const timer = setTimeout(() => reject(new Error('bootstrap timeout')), timeout);
          promise
            .then((value) => {
              clearTimeout(timer);
              resolve(value);
            })
            .catch((error) => {
              clearTimeout(timer);
              reject(error);
            });
        });
      }

      const [
        liveGameInfoResult,
        currentAndNextResult,
        groupsOrderResult,
        scheduleResult,
        robotResult,
        groupRankResult,
      ] = await Promise.allSettled([
        withBootstrapTimeout(fetchLiveGameInfo()),
        withBootstrapTimeout(fetchCurrentAndNextMatches()),
        withBootstrapTimeout(fetchGroupsOrder()),
        withBootstrapTimeout(fetchSchedule()),
        withBootstrapTimeout(fetchRobotData()),
        withBootstrapTimeout(fetchGroupRankInfo()),
      ]);

      if (seq !== bootstrapSeq) {
        return;
      }

      if (liveGameInfoResult.status === 'fulfilled') {
        liveGameInfo.value = liveGameInfoResult.value;
      }

      if (currentAndNextResult.status === 'fulfilled') {
        currentAndNextMatches.value = currentAndNextResult.value;
      }

      if (groupsOrderResult.status === 'fulfilled') {
        groupsOrder.value = groupsOrderResult.value;
      }

      if (scheduleResult.status === 'fulfilled') {
        schedule.value = scheduleResult.value;
      }

      if (robotResult.status === 'fulfilled') {
        robotData.value = robotResult.value;
      }

      if (groupRankResult.status === 'fulfilled') {
        groupRankInfo.value = groupRankResult.value;
      }

      ensureZoneSelection();
      ensureQualitySelection();

      if (liveGameInfoResult.status === 'rejected') {
        streamErrorMessage.value = '直播流请求失败，请检查网络后重试';
      }

      streamLoading.value = false;

      pollingController = startRmPolling(
        {
          onLiveGameInfo(data) {
            liveGameInfo.value = data;
            ensureZoneSelection();
            ensureQualitySelection();
          },
          onCurrentAndNextMatches(data) {
            currentAndNextMatches.value = data;
            ensureZoneSelection();
          },
          onGroupsOrder(data) {
            groupsOrder.value = data;
          },
          onRobotData(data) {
            robotData.value = data;
          },
          onSchedule(data) {
            schedule.value = data;
            ensureZoneSelection();
          },
          onError() {
            if (!streamUrl.value) {
              streamErrorMessage.value = '直播流暂时不可用，请稍后重试';
            }
          },
        },
        {},
        {
          robotDataDelayMs: 5000,
        },
      );
    })();
  }

  async function retryLiveStream() {
    streamErrorMessage.value = '';
    streamLoading.value = true;

    try {
      liveGameInfo.value = await fetchLiveGameInfo();
      ensureZoneSelection();
      ensureQualitySelection();
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
    groupRankInfo,
    robotData,
    schedule,
    selectedZoneId,
    selectedQualityRes,
    streamLoading,
    streamErrorMessage,
    liveZones,
    selectedZone,
    selectedZoneName,
    zoneOptions,
    qualityOptions,
    streamUrl,
    effectiveStreamUrl,
    effectiveStreamErrorMessage,
    groupSections,
    teamGroupMap,
    setZone,
    setQuality,
    startPolling,
    stopPolling,
    retryLiveStream,
  };
});
