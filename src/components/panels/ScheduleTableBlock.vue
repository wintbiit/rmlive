<script setup lang="ts">
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Tag from 'primevue/tag';
import { toStatusSeverity, type ScheduleRowItem } from '../../services/scheduleView';
import TeamInfoCard from '../common/TeamInfoCard.vue';

interface Props {
  rows: ScheduleRowItem[];
  teamGroupMap?: Record<string, { group: string; rank: string }>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  teamSelect: [teamName: string];
}>();

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

function showSlug(slug: string): boolean {
  const value = String(slug || '').trim();
  return value.length > 0 && value !== '-';
}

function resolveStageLabel(stage: string, slug: string): string {
  return showSlug(slug) ? String(slug).trim() : stage;
}
</script>

<template>
  <div class="table-wrap">
    <DataTable :value="rows" paginator :rows="8" size="small" stripedRows tableStyle="min-width: 48rem">
      <Column header="场次">
        <template #body="{ data }">
          <Tag severity="contrast" :value="`#${data.orderNumber}`" />
        </template>
      </Column>

      <Column header="开赛时间">
        <template #body="{ data }">
          <span class="time-cell"><i class="pi pi-clock" />{{ data.dateTimeLabel }}</span>
        </template>
      </Column>

      <Column header="阶段">
        <template #body="{ data }">
          <Tag severity="secondary" :value="resolveStageLabel(data.stage, data.slug)" />
        </template>
      </Column>

      <Column header="红方" style="min-width: 16rem">
        <template #body="{ data }">
          <TeamInfoCard
            compact
            :team-name="data.redTeam.teamName"
            :college-name="data.redTeam.collegeName"
            :logo="data.redTeam.logo"
            :group-label="toGroupLabel(data.redTeam.teamName)"
            @select="onSelectTeam"
          />
        </template>
      </Column>

      <Column header="蓝方" style="min-width: 16rem">
        <template #body="{ data }">
          <TeamInfoCard
            compact
            :team-name="data.blueTeam.teamName"
            :college-name="data.blueTeam.collegeName"
            :logo="data.blueTeam.logo"
            :group-label="toGroupLabel(data.blueTeam.teamName)"
            @select="onSelectTeam"
          />
        </template>
      </Column>

      <Column field="score" header="比分" />
      <Column field="gameScore" header="小局" />

      <Column header="状态">
        <template #body="{ data }">
          <Tag :severity="toStatusSeverity(data.statusRaw)" :value="data.status" />
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.table-wrap {
  overflow-x: auto;
}

.time-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.time-cell .pi {
  font-size: 0.72rem;
  opacity: 0.78;
}

:deep(.p-datatable .p-datatable-tbody > tr > td) {
  vertical-align: middle;
}
</style>
