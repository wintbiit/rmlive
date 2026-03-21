<script setup lang="ts">
import Card from 'primevue/card';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Tag from 'primevue/tag';
import { computed } from 'vue';
import type { RobotData } from '../../types/api';

interface Props {
  payload: RobotData | null;
  selectedZoneId: string | null;
  teamName?: string | null;
}

const props = defineProps<Props>();

interface RobotRow {
  team: string;
  robot: string;
  robotType: string;
  eaKDA: string;
  eagHurt: number;
  eaSmallHitRate: number;
  combatScore: number;
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getZones(data: RobotData | null): Record<string, unknown>[] {
  if (!data || typeof data !== 'object') {
    return [];
  }

  const root = data as Record<string, unknown>;
  if (Array.isArray(root.zones)) {
    return root.zones as Record<string, unknown>[];
  }

  return [];
}

function toRows(
  data: RobotData | null,
  selectedZoneId: string | null,
  teamName: string | null | undefined,
): RobotRow[] {
  const zones = getZones(data);
  if (!zones.length) {
    return [];
  }

  const zone = zones.find((item) => String(item.id ?? item.zoneId ?? '') === String(selectedZoneId ?? '')) ?? zones[0];
  const teams = (zone.teams ?? []) as Record<string, unknown>[];

  const rows: RobotRow[] = [];

  for (const team of teams) {
    const currentTeamName = String(team.name ?? '-');
    const robots = (team.robots ?? []) as Record<string, unknown>[];

    for (const robot of robots) {
      const robotType = String(robot.robotType ?? robot.type ?? '-');
      const robotNumber = toNumber(robot.robotNumber);
      const eaKDA = typeof robot.eaKDA === 'string' ? robot.eaKDA : '-';
      const eagHurt = toNumber(robot.eagHurt);
      const eaSmallHitRate = toNumber(robot.eaSmallHitRate);
      const kdaScore = toNumber(robot.eagKdaScore);
      const combatScore = eagHurt > 0 ? eagHurt : kdaScore > 0 ? kdaScore : eaSmallHitRate;
      const robotName = String(robot.name ?? '').trim();
      const robotLabel = robotName || (robotNumber > 0 ? `${robotType}-${robotNumber}` : robotType);

      rows.push({
        team: currentTeamName,
        robot: robotLabel,
        robotType,
        eaKDA,
        eagHurt,
        eaSmallHitRate,
        combatScore,
      });
    }
  }

  const filteredRows = teamName && teamName.trim().length ? rows.filter((row) => row.team === teamName) : rows;

  return filteredRows.sort((a, b) => b.combatScore - a.combatScore);
}

const rows = computed(() => toRows(props.payload, props.selectedZoneId, props.teamName));

function formatRate(value: number): string {
  if (!Number.isFinite(value)) {
    return '-';
  }

  const percent = value > 0 && value <= 1 ? value * 100 : value;
  return `${percent.toFixed(1)}%`;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '-';
  }

  return value.toLocaleString('zh-CN');
}

function robotTypeSeverity(type: string): 'secondary' | 'success' | 'info' | 'warn' | 'danger' {
  const normalized = type.toLowerCase();
  if (normalized.includes('hero')) {
    return 'danger';
  }

  if (normalized.includes('infantry')) {
    return 'success';
  }

  if (normalized.includes('sapper') || normalized.includes('engineer')) {
    return 'info';
  }

  if (normalized.includes('guard') || normalized.includes('radar')) {
    return 'warn';
  }

  return 'secondary';
}
</script>

<template>
  <Card>
    <template #title> 比赛数据{{ props.teamName ? ` - ${props.teamName}` : '' }} </template>
    <template #content>
      <p v-if="props.teamName" class="tip">已按队伍筛选，可在上方卡片切换查看其他队伍。</p>

      <div class="table-wrap">
        <DataTable class="table" :value="rows" size="small" stripedRows showGridlines tableStyle="min-width: 46rem">
          <Column field="robot" header="机器人" style="min-width: 9rem" />
          <Column field="robotType" header="类型" style="min-width: 7rem">
            <template #body="slotProps">
              <Tag :value="slotProps.data.robotType" :severity="robotTypeSeverity(slotProps.data.robotType)" rounded />
            </template>
          </Column>
          <Column field="eaKDA" header="KDA" style="min-width: 6.5rem" />
          <Column field="eagHurt" header="伤害" style="min-width: 7rem">
            <template #body="slotProps">{{ formatNumber(slotProps.data.eagHurt) }}</template>
          </Column>
          <Column field="eaSmallHitRate" header="命中率" style="min-width: 6.5rem">
            <template #body="slotProps">{{ formatRate(slotProps.data.eaSmallHitRate) }}</template>
          </Column>
          <Column field="combatScore" header="综合" style="min-width: 6.5rem">
            <template #body="slotProps">
              <Tag :value="formatNumber(slotProps.data.combatScore)" severity="info" />
            </template>
          </Column>
        </DataTable>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.tip {
  margin: 0 0 0.6rem;
  font-size: 0.84rem;
  opacity: 0.8;
}

.table {
  margin-top: 0.5rem;
}

.table-wrap {
  overflow-x: auto;
}
</style>
