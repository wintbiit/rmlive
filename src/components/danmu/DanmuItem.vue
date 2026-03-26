<script setup lang="ts">
import Card from 'primevue/card';
import Popover from 'primevue/popover';
import Tag from 'primevue/tag';
import { computed, onBeforeUnmount, ref } from 'vue';
import { resolveDisplayNickname, resolveDisplaySchool, resolveTooltipMeta } from '../../services/danmuView';
import type { DanmuMessage } from '../../types/api';

const props = defineProps<{
  message: DanmuMessage;
}>();

const school = computed(() => resolveDisplaySchool(props.message));
const nickname = computed(() => resolveDisplayNickname(props.message));
const tooltipMeta = computed(() => resolveTooltipMeta(props.message));
const timeOnly = computed(() => new Date(props.message.timestamp).toLocaleTimeString('zh-CN', { hour12: false }));

const tooltipRef = ref<any>(null);
let hideTimer: number | null = null;

function clearHideTimer() {
  if (hideTimer !== null) {
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }
}

function showTooltip(event: MouseEvent | FocusEvent) {
  clearHideTimer();
  tooltipRef.value?.show(event);
}

function scheduleHide() {
  clearHideTimer();
  hideTimer = window.setTimeout(() => {
    tooltipRef.value?.hide();
  }, 120);
}

onBeforeUnmount(() => {
  clearHideTimer();
});

const year = computed(() => `${tooltipMeta.value.year}年${tooltipMeta.value.role}`);
</script>

<template>
  <article
    class="danmu-item"
    tabindex="0"
    @mouseenter="showTooltip"
    @mouseleave="scheduleHide"
    @focusin="showTooltip"
    @focusout="scheduleHide"
  >
    <aside class="meta-col">
      <p class="school">{{ school }}</p>
      <p class="nickname">{{ nickname }}</p>
      <p class="time">{{ timeOnly }}</p>
    </aside>
    <p class="content">{{ message.text }}</p>

    <Popover ref="tooltipRef" :dismissable="true" class="danmu-tooltip-popover">
      <div @mouseenter="clearHideTimer" @mouseleave="scheduleHide">
        <Card class="danmu-tooltip-card">
          <template #title>{{ tooltipMeta.nickname }}</template>
          <template #content>
            <p class="danmu-tooltip-message">{{ message.text }}</p>
            <div class="danmu-tooltip-tags">
              <Tag v-if="tooltipMeta.school" :value="tooltipMeta.school" severity="success" />
              <Tag v-if="tooltipMeta.year" :value="year" severity="secondary" />
            </div>
            <p v-if="tooltipMeta.username" class="danmu-tooltip-raw">{{ tooltipMeta.username }}</p>
            <p class="danmu-tooltip-time">{{ tooltipMeta.timeLabel }}</p>
          </template>
        </Card>
      </div>
    </Popover>
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
  background: var(--danmu-item-bg);
}

.meta-col {
  min-width: 0;
}

.school,
.nickname,
.time {
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

.time {
  font-size: 0.65rem;
  opacity: 0.72;
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

.danmu-tooltip-message,
.danmu-tooltip-raw,
.danmu-tooltip-time {
  margin: 0;
}

.danmu-tooltip-message {
  font-size: 0.72rem;
  line-height: 1.35;
  white-space: pre-wrap;
  word-break: break-word;
}

.danmu-tooltip-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.28rem;
}

.danmu-tooltip-raw {
  margin-top: 0.28rem;
  font-size: 0.66rem;
  opacity: 0.8;
  word-break: break-all;
}

.danmu-tooltip-time {
  margin-top: 0.25rem;
  font-size: 0.64rem;
  opacity: 0.7;
}
</style>
