<script setup lang="ts">
import { storeToRefs } from 'pinia';
import ScrollTop from 'primevue/scrolltop';
import Skeleton from 'primevue/skeleton';
import VirtualScroller from 'primevue/virtualscroller';
import { computed } from 'vue';
import { useDanmuStore } from '../../stores/danmu';
import type { DanmuMessage } from '../../types/api';
import DanmuItem from './DanmuItem.vue';

const danmuStore = useDanmuStore();
const { messages } = storeToRefs(danmuStore);

const virtualItems = computed<Array<DanmuMessage | null>>(() => messages.value);
</script>

<template>
  <section class="danmu-panel">
    <VirtualScroller
      v-if="messages.length"
      :items="virtualItems"
      :itemSize="56"
      :delay="60"
      class="list-body danmu-virtual"
      :style="{ height: '100%' }"
    >
      <template #item="slotProps">
        <div v-if="slotProps.item" class="list-row">
          <DanmuItem :message="slotProps.item" />
        </div>
        <div v-else class="list-row">
          <Skeleton width="100%" height="2rem" />
        </div>
      </template>
    </VirtualScroller>

    <div v-else class="list-body list-empty-wrap">
      <div class="list-empty">暂无弹幕</div>
      <div class="list-skeleton">
        <Skeleton width="100%" height="1.6rem" />
        <Skeleton width="100%" height="1.6rem" />
      </div>
    </div>

    <ScrollTop target="parent" :threshold="120" icon="pi pi-arrow-up" />
  </section>
</template>

<style scoped>
.danmu-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.list-body {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow: auto;
  padding: 0.35rem;
}

.list-row {
  padding-bottom: 0.28rem;
}

.list-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 0.8rem;
  opacity: 0.66;
}

.list-skeleton {
  display: grid;
  gap: 0.28rem;
}

:deep(.p-scrolltop) {
  right: 0.75rem;
  bottom: 0.75rem;
}

.list-body :deep(.p-virtualscroller-content) {
  overflow-x: hidden;
}
</style>
