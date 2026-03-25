<script setup lang="ts">
import Dialog from 'primevue/dialog';
import Listbox from 'primevue/listbox';
import Message from 'primevue/message';
import Tag from 'primevue/tag';
import { computed, ref, watch } from 'vue';
import { resolveGroupRankSectionByGroup, resolveGroupRankSectionByTeam } from '../../services/groupRankView';
import type { GroupSection } from '../../services/groupView';
import {
  buildDialogRankRows,
  buildDialogTeamRows,
  findDialogTeamGroupSection,
  sortDialogRankRows,
} from '../../services/matchDataFormat';
import type { GroupRankInfo, RobotData } from '../../types/api';
import TeamLogo from '../common/TeamLogo.vue';
import RobotDataPanel from '../panels/RobotDataPanel.vue';

interface Props {
  visible: boolean;
  selectedTeam: string | null;
  selectedZoneId: string | null;
  selectedZoneName: string | null;
  groupSections: GroupSection[];
  groupRankInfo: GroupRankInfo | null;
  robotData: RobotData | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:visible': [visible: boolean];
  'team-select': [teamName: string];
}>();

const dialogTeamGroupSection = computed(() => findDialogTeamGroupSection(props.groupSections, props.selectedTeam));

const dialogTeamRows = computed(() => buildDialogTeamRows(dialogTeamGroupSection.value, props.selectedTeam));

const dialogRankSection = computed(() => {
  const byGroup = resolveGroupRankSectionByGroup(
    props.groupRankInfo,
    props.selectedZoneId,
    props.selectedZoneName,
    dialogTeamGroupSection.value?.group ?? null,
  );

  if (byGroup) {
    return byGroup;
  }

  return resolveGroupRankSectionByTeam(
    props.groupRankInfo,
    props.selectedZoneId,
    props.selectedZoneName,
    props.selectedTeam,
  );
});

const dialogRankRows = computed(() =>
  buildDialogRankRows(dialogRankSection.value, dialogTeamRows.value, props.selectedTeam),
);
const sortedDialogRankRows = computed(() => sortDialogRankRows(dialogRankRows.value));

const hasGroupRankSection = computed(() => Boolean(dialogRankSection.value || dialogTeamGroupSection.value));
const rankSectionTitle = computed(
  () => dialogRankSection.value?.groupName ?? dialogTeamGroupSection.value?.group ?? '当前组',
);
const compactRankRows = computed(() => sortedDialogRankRows.value.slice(0, 8));
const selectedRankTeam = ref<string | null>(null);
const rankListOptions = computed(() =>
  compactRankRows.value.map((row) => ({
    ...row,
    label: row.teamName,
    value: row.teamName,
  })),
);

watch(
  () => props.selectedTeam,
  (team) => {
    selectedRankTeam.value = team;
  },
  { immediate: true },
);

watch(selectedRankTeam, (team) => {
  if (!team || team === props.selectedTeam) {
    return;
  }
  onOpenTeamData(team);
});

function onDialogVisibleChange(value: boolean) {
  emit('update:visible', value);
}

function onOpenTeamData(teamName: string) {
  if (!teamName || teamName === '-') {
    return;
  }

  emit('team-select', teamName);
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="比赛数据"
    :style="{ width: 'min(1100px, 96vw)' }"
    @update:visible="onDialogVisibleChange"
  >
    <section v-if="hasGroupRankSection" class="group-block">
      <h3>{{ rankSectionTitle }} 组排名</h3>
      <Listbox
        v-if="rankListOptions.length"
        v-model="selectedRankTeam"
        :options="rankListOptions"
        option-label="label"
        option-value="value"
        class="rank-listbox"
        list-style="max-height: 20rem"
      >
        <template #option="slotProps">
          <div class="rank-option">
            <div class="rank-main">
              <Tag
                :value="`#${slotProps.option.rankDisplay}`"
                :severity="slotProps.option.isCurrent ? 'info' : 'contrast'"
              />
              <TeamLogo
                v-if="slotProps.option.collegeLogo"
                :logo="slotProps.option.collegeLogo"
                :team-name="slotProps.option.teamName"
                custom-size="1.6rem"
                class="rank-team-logo"
              />
              <div class="rank-meta">
                <strong>{{ slotProps.option.teamName }}</strong>
                <small>{{ slotProps.option.collegeName }}</small>
              </div>
              <Tag v-if="slotProps.option.isCurrent" value="当前查看" severity="info" />
            </div>
            <div class="rank-metrics">
              <Tag :value="`胜平负 ${slotProps.option.winDrawLose}`" severity="secondary" />
              <Tag :value="`积分 ${slotProps.option.points}`" severity="secondary" />
              <Tag :value="`净胜 ${slotProps.option.netVictoryPoint}`" severity="secondary" />
            </div>
          </div>
        </template>
      </Listbox>
      <Message v-else severity="warn" :closable="false" class="rank-empty-tip">
        当前组暂无可展示的详细排名数据
      </Message>
    </section>
    <Message v-else severity="warn" :closable="false">未匹配到当前队伍对应的小组排名数据</Message>

    <RobotDataPanel v-if="visible" :payload="robotData" :selected-zone-id="selectedZoneId" :team-name="selectedTeam" />
  </Dialog>
</template>

<style scoped>
:deep(.p-dialog) {
  max-width: calc(100vw - 1rem);
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

.rank-listbox {
  margin-top: 0.2rem;
}

.rank-option {
  display: grid;
  gap: 0.4rem;
  width: 100%;
}

.rank-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rank-team-logo {
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

.rank-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
</style>
