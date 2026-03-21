export type PollingRunner = () => Promise<void>;

export interface PollingTask {
  stop: () => void;
}

export function startPolling(runner: PollingRunner, intervalMs: number): PollingTask {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const tick = async () => {
    if (stopped) {
      return;
    }

    await runner().catch(() => {
      // 错误由上层处理，这里保持轮询继续执行
    });

    if (!stopped) {
      timer = setTimeout(tick, intervalMs);
    }
  };

  void tick();

  return {
    stop() {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
      }
    },
  };
}
