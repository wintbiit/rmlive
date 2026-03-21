<script setup lang="ts">
import Card from 'primevue/card';
import { computed } from 'vue';
import type { GroupsOrder } from '../../types/api';

interface GroupRow {
  group: string;
  rank: string;
  teamName: string;
  collegeName: string;
}

interface Props {
  payload: GroupsOrder | null;
  selectedZoneId: string | null;
  focusTeams?: string[];
}

const props = defineProps<Props>();

function getZones(payload: GroupsOrder | null): Record<string, unknown>[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const root = payload as Record<string, unknown>;
  const graphZones = ((root.data as Record<string, unknown> | undefined)?.event as Record<string, unknown> | undefined)
    ?.zones as Record<string, unknown> | undefined;

  if (Array.isArray(graphZones?.nodes)) {
    return graphZones.nodes as Record<string, unknown>[];
  }

  if (Array.isArray(root.zones)) {
    return root.zones as Record<string, unknown>[];
  }

  return [];
}

function toRows(payload: GroupsOrder | null, selectedZoneId: string | null): GroupRow[] {
  const zones = getZones(payload);
  if (!zones.length) {
    return [];
  }

  const targetZone = zones.find((zone) => String(zone.id ?? '') === String(selectedZoneId ?? '')) ?? zones[0];
  const groups = ((targetZone.groups as Record<string, unknown> | undefined)?.nodes ?? []) as Record<string, unknown>[];

  const rows: GroupRow[] = [];

  for (const group of groups) {
    const groupName = String(group.name ?? '-');
    const players = ((group.players as Record<string, unknown> | undefined)?.nodes ?? []) as Record<string, unknown>[];

    for (const player of players) {
      const team = player.team as Record<string, unknown> | undefined;
      rows.push({
        group: groupName,
        rank: String(player.rank ?? '-'),
        teamName: String(team?.name ?? '-'),
        collegeName: String(team?.collegeName ?? '-'),
      });
    }
  }

  return rows.sort((a, b) => {
    if (a.group !== b.group) {
      return a.group.localeCompare(b.group);
    }
    return Number(a.rank) - Number(b.rank);
  });
}

const rows = computed(() => toRows(props.payload, props.selectedZoneId));

const focusTeamSet = computed(() => {
  const list = Array.isArray(props.focusTeams) ? props.focusTeams : [];
  return new Set(list.filter(Boolean));
});

const groups = computed(() => {
  const grouped = new Map<string, GroupRow[]>();
  for (const row of rows.value) {
    const bucket = grouped.get(row.group);
    if (bucket) {
      bucket.push(row);
      continue;
    }
    grouped.set(row.group, [row]);
  }

  return Array.from(grouped.entries()).map(([groupName, groupRows]) => ({
    groupName,
    rows: groupRows,
  }));
});
</script>

<template>
  <Card>
    <template #title> 分组信息 </template>
    <template #content>
      <div class="group-grid">
        <section v-for="group in groups" :key="group.groupName" class="group-card">
          <header class="group-head">
            <h3>{{ group.groupName }} 组</h3>
          </header>

          <div class="group-rows">
            <article
              v-for="row in group.rows"
              :key="`${row.group}-${row.teamName}`"
              class="team-row"
              :class="{ linked: focusTeamSet.has(row.teamName) }"
            >
              <span class="rank">#{{ row.rank }}</span>
              <div class="meta">
                <strong>{{ row.teamName }}</strong>
                <small>{{ row.collegeName }}</small>
              </div>
              <span v-if="focusTeamSet.has(row.teamName)" class="linked-mark">当前对局</span>
            </article>
          </div>
        </section>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.group-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.group-card {
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 0.75rem;
  padding: 0.65rem;
}

.group-head h3 {
  margin: 0;
  font-size: 0.95rem;
}

.group-rows {
  margin-top: 0.45rem;
  display: grid;
  gap: 0.35rem;
}

.team-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.55rem;
  border-radius: 0.6rem;
  background: rgba(15, 23, 42, 0.28);
  padding: 0.4rem 0.5rem;
}

.team-row.linked {
  outline: 1px solid rgba(59, 130, 246, 0.7);
  background: rgba(59, 130, 246, 0.12);
}

.rank {
  font-weight: 700;
  font-size: 0.82rem;
  opacity: 0.9;
}

.meta {
  min-width: 0;
}

.meta strong {
  display: block;
  font-size: 0.9rem;
}

.meta small {
  display: block;
  font-size: 0.76rem;
  opacity: 0.74;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.linked-mark {
  font-size: 0.72rem;
  color: #93c5fd;
}
</style>
