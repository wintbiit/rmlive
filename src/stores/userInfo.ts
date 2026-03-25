import { userInfoRequestEvent, userInfoResponseEvent } from '@/constants/userInfoEvents';
import { UserInfo } from '@/types/user';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUserInfoStore = defineStore('userInfo', () => {
  const userInfo = ref<UserInfo | null>(null);
  const isRequesting = ref(false);

  const isIFrame = window.self !== window.top;

  const requestUserInfo = async (retryCount = 0): Promise<void> => {
    if (userInfo.value) {
      // Already have data, no need to request
      return;
    }

    if (isRequesting.value) {
      // Request in progress, wait for it
      return;
    }

    isRequesting.value = true;

    try {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Request timeout'));
        }, 5000);
      });

      // Wait for response with timeout
      const responseHandler = new Promise<UserInfo | null>((resolve) => {
        const handler = (e: CustomEvent<UserInfo | null>) => {
          window.removeEventListener(userInfoResponseEvent, handler as EventListener);
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          resolve(e.detail);
        };
        window.addEventListener(userInfoResponseEvent, handler as EventListener);
      });

      // Send request to parent
      window.parent.dispatchEvent(new CustomEvent(userInfoRequestEvent));

      // Race between response and timeout
      const response = await Promise.race([responseHandler, timeoutPromise]);
      userInfo.value = response;

      if (response) {
        console.log('[rmlive] User info received:', response);
      } else if (retryCount < 3) {
        console.warn(`[rmlive] User info request failed, retry ${retryCount + 1}/3`);
        isRequesting.value = false;
        // Exponential backoff: 500ms, 1s, 2s
        const delays = [500, 1000, 2000];
        await new Promise((resolve) => setTimeout(resolve, delays[retryCount] || 2000));
        await requestUserInfo(retryCount + 1);
      }
    } catch (error) {
      if (retryCount < 3) {
        console.warn(
          `[rmlive] User info request error: ${error instanceof Error ? error.message : String(error)}, retry ${retryCount + 1}/3`,
        );
        isRequesting.value = false;
        // Exponential backoff: 500ms, 1s, 2s
        const delays = [500, 1000, 2000];
        await new Promise((resolve) => setTimeout(resolve, delays[retryCount] || 2000));
        await requestUserInfo(retryCount + 1);
      } else {
        console.error('[rmlive] User info request failed after 3 retries:', error);
      }
    } finally {
      isRequesting.value = false;
    }
  };

  if (window.parent && isIFrame) {
    // Request user info once on initialization
    requestUserInfo();
  }

  return {
    userInfo,
  };
});
