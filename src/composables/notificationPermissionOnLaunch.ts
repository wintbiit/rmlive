/**
 * Best-effort: ask for Notification permission once per app load when not permanently denied.
 * Browsers only show a prompt when permission is `default`; otherwise they resolve immediately.
 */
export function requestNotificationPermissionOnLaunch(): void {
  if (typeof globalThis.Notification === 'undefined') {
    return;
  }
  if (globalThis.Notification.permission === 'denied') {
    return;
  }
  void globalThis.Notification.requestPermission().catch(() => {
    /* user dismiss or unsupported */
  });
}
