<script setup lang="ts">
import { computed } from 'vue';
import { useDanmuStore } from '../../stores/danmu';
import type { DanmuMessage } from '../../types/api';

const props = defineProps<{
  message: DanmuMessage;
}>();

const danmuStore = useDanmuStore();

const school = computed(() => danmuStore.resolveDisplaySchool(props.message));
const nickname = computed(() => danmuStore.resolveDisplayNickname(props.message));
const tooltipMeta = computed(() => danmuStore.resolveTooltipMeta(props.message));

function escapeHtml(value: string): string {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const tooltipHtml = computed(() => {
  const meta = tooltipMeta.value;
  const chips: string[] = [];

  if (meta.school) {
    chips.push(`<span class="danmu-tip-chip danmu-tip-chip--school">${escapeHtml(meta.school)}</span>`);
  }
  if (meta.year) {
    chips.push(`<span class="danmu-tip-chip">${escapeHtml(meta.year)}</span>`);
  }
  if (meta.role) {
    chips.push(`<span class="danmu-tip-chip">${escapeHtml(meta.role)}</span>`);
  }

  const usernameBlock = meta.username ? `<p class="danmu-tip-raw">${escapeHtml(meta.username)}</p>` : '';

  return [
    '<section class="danmu-tip-card">',
    '  <header class="danmu-tip-head">',
    `    <span class="danmu-tip-name">${escapeHtml(meta.nickname)}</span>`,
    `    <span class="danmu-tip-source">${escapeHtml(meta.sourceLabel)}</span>`,
    '  </header>',
    `  <p class="danmu-tip-message">${escapeHtml(props.message.text)}</p>`,
    chips.length ? `  <div class="danmu-tip-chips">${chips.join('')}</div>` : '',
    usernameBlock,
    `  <footer class="danmu-tip-time">${escapeHtml(meta.timeLabel)}</footer>`,
    '</section>',
  ].join('');
});
</script>

<template>
  <article
    v-tooltip.left="{
      value: tooltipHtml,
      escape: false,
      showDelay: 120,
      hideDelay: 80,
    }"
    class="danmu-item"
  >
    <aside class="meta-col">
      <p class="school">{{ school }}</p>
      <p class="nickname">{{ nickname }}</p>
    </aside>
    <p class="content">{{ message.text }}</p>
  </article>
</template>

<style scoped>
.danmu-item {
  display: grid;
  grid-template-columns: 8.2rem 1fr;
  gap: 0.45rem;
  align-items: start;
  padding: 0.28rem 0.4rem;
  border-radius: 0.4rem;
  background: rgba(148, 163, 184, 0.1);
}

.meta-col {
  min-width: 0;
}

.school,
.nickname {
  margin: 0;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.school {
  font-size: 0.68rem;
  opacity: 0.88;
}

.nickname {
  font-size: 0.74rem;
  font-weight: 600;
}

.content {
  margin: 0;
  min-width: 0;
  font-size: 0.74rem;
  line-height: 1.25;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}

:global(.p-tooltip .p-tooltip-text) {
  max-width: min(22rem, calc(100vw - 2rem));
  box-sizing: border-box;
  padding: 0.45rem;
  background: rgba(15, 23, 42, 0.98);
}

:global(.danmu-tip-card) {
  width: min(20rem, calc(100vw - 2.6rem));
  max-width: 100%;
  color: #e2e8f0;
  display: grid;
  gap: 0.45rem;
}

:global(.danmu-tip-head) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
}

:global(.danmu-tip-name) {
  font-size: 0.78rem;
  font-weight: 700;
  color: #f8fafc;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.danmu-tip-source) {
  flex-shrink: 0;
  font-size: 0.65rem;
  line-height: 1;
  padding: 0.2rem 0.38rem;
  border-radius: 999px;
  background: rgba(56, 189, 248, 0.22);
  color: #bae6fd;
}

:global(.danmu-tip-message) {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.45;
  color: #f8fafc;
  padding: 0.42rem 0.5rem;
  border-radius: 0.45rem;
  background: rgba(148, 163, 184, 0.14);
  word-break: break-word;
}

:global(.danmu-tip-chips) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.28rem;
}

:global(.danmu-tip-chip) {
  font-size: 0.64rem;
  line-height: 1;
  padding: 0.22rem 0.38rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  color: #cbd5e1;
}

:global(.danmu-tip-chip--school) {
  background: rgba(34, 197, 94, 0.2);
  color: #bbf7d0;
}

:global(.danmu-tip-raw) {
  margin: 0;
  font-size: 0.67rem;
  line-height: 1.3;
  color: #94a3b8;
  word-break: break-all;
}

:global(.danmu-tip-time) {
  font-size: 0.63rem;
  color: #94a3b8;
  word-break: break-word;
}
</style>
