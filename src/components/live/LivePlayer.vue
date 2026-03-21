<script setup lang="ts">
import Artplayer from 'artplayer';
import Hls from 'hls.js';
import Button from 'primevue/button';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';
import { onBeforeUnmount, ref, watch } from 'vue';

interface Props {
  streamUrl: string | null;
  loading: boolean;
  errorMessage: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  retry: [];
}>();

const container = ref<HTMLDivElement | null>(null);
let player: Artplayer | null = null;

function destroyPlayer() {
  if (player) {
    player.destroy(false);
    player = null;
  }
}

function mountPlayer(url: string) {
  if (!container.value) {
    return;
  }

  destroyPlayer();

  player = new Artplayer({
    container: container.value,
    url,
    volume: 0.7,
    autoplay: true,
    setting: true,
    hotkey: true,
    pip: true,
    fullscreen: true,
    fullscreenWeb: true,
    customType: {
      m3u8(video, m3u8Url) {
        if (Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource(m3u8Url);
          hls.attachMedia(video);
          player?.on('destroy', () => hls.destroy());
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = m3u8Url;
        }
      },
    },
  });
}

watch(
  () => props.streamUrl,
  (url) => {
    if (url) {
      mountPlayer(url);
    } else {
      destroyPlayer();
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  destroyPlayer();
});
</script>

<template>
  <div class="player-shell">
    <div v-if="loading" class="overlay center">
      <ProgressSpinner />
    </div>

    <div v-else-if="errorMessage" class="overlay center">
      <Message severity="error" :closable="false">
        {{ errorMessage }}
      </Message>
      <Button class="retry-btn" label="重试加载" size="small" @click="emit('retry')" />
    </div>

    <div v-else-if="!streamUrl" class="overlay center">
      <Message severity="warn" :closable="false"> 暂未获取到直播流地址 </Message>
    </div>

    <div ref="container" class="player-container" />
  </div>
</template>

<style scoped>
.player-shell {
  position: relative;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 260px;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  overflow: hidden;
  background: #0f172a;
}

.player-container {
  width: 100%;
  height: 100%;
  min-width: 0;
}

.overlay {
  position: absolute;
  z-index: 4;
  inset: 0;
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  backdrop-filter: blur(1px);
  background: rgba(15, 23, 42, 0.35);
}

.center {
  text-align: center;
}

.retry-btn {
  margin-top: 0.35rem;
}

:deep(.art-video-player),
:deep(.art-video-player video),
:deep(.art-video-player .art-mask),
:deep(.art-video-player .art-player-app) {
  width: 100% !important;
  max-width: 100% !important;
}

:deep(.p-message) {
  max-width: calc(100% - 0.5rem);
  word-break: break-word;
}

@media (max-width: 768px) {
  .player-shell {
    min-height: 190px;
    border-radius: 10px;
  }
}
</style>
