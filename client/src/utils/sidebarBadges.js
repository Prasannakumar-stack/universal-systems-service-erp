export const SIDEBAR_BADGES_UPDATED_EVENT = 'us:sidebar-badges-updated';

export function emitSidebarBadgesUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SIDEBAR_BADGES_UPDATED_EVENT));
}
