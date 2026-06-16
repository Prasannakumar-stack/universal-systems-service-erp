export const STAFF_SW_UPDATE_READY_EVENT = 'us:pwa-update-ready';

const STAFF_MANIFEST_LINK_ID = 'us-staff-manifest-link';
const STAFF_MANIFEST_URL = '/manifest.json';
const STAFF_SW_URL = '/sw.js';
const STAFF_SW_SCOPE = '/app';
const STAFF_CACHE_PREFIX = 'us-staff-pwa-';

let refreshAfterControllerChange = false;
let pendingWorker = null;
let controllerChangeBound = false;
let updateWatchCleanup = null;
let registrationInFlight = null;

function canUseServiceWorker() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && window.isSecureContext
    && !import.meta.env.DEV;
}

function isStaffRegistration(registration) {
  const urls = [
    registration?.active?.scriptURL,
    registration?.waiting?.scriptURL,
    registration?.installing?.scriptURL
  ].filter(Boolean);
  return urls.some((url) => url.endsWith(STAFF_SW_URL));
}

function clearUpdateWatch() {
  if (typeof updateWatchCleanup === 'function') updateWatchCleanup();
  updateWatchCleanup = null;
}

function notifyUpdateReady(worker) {
  pendingWorker = worker;
  window.dispatchEvent(new CustomEvent(STAFF_SW_UPDATE_READY_EVENT, { detail: { worker } }));
}

function watchInstallingWorker(worker) {
  if (!worker) return;
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
      notifyUpdateReady(worker);
    }
  });
}

function watchForControllerChange() {
  if (controllerChangeBound || !canUseServiceWorker()) return;
  controllerChangeBound = true;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshAfterControllerChange) return;
    refreshAfterControllerChange = false;
    window.location.reload();
  });
}

function watchForUpdateChecks(registration) {
  clearUpdateWatch();

  const requestUpdate = () => registration.update().catch(() => {});
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') requestUpdate();
  };
  const intervalId = window.setInterval(requestUpdate, 60 * 60 * 1000);

  window.addEventListener('focus', requestUpdate);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  updateWatchCleanup = () => {
    window.removeEventListener('focus', requestUpdate);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.clearInterval(intervalId);
  };

  requestUpdate();
}

async function getStaffRegistrations() {
  if (!canUseServiceWorker()) return [];
  const registrations = await navigator.serviceWorker.getRegistrations();
  return registrations.filter(isStaffRegistration);
}

export function isStaffInstallablePath(pathname = '') {
  return pathname === '/app' || pathname.startsWith('/app/');
}

export function ensureStaffManifestLink() {
  if (typeof document === 'undefined') return;

  let link = document.head.querySelector(`#${STAFF_MANIFEST_LINK_ID}`);
  if (!link) {
    link = document.createElement('link');
    link.id = STAFF_MANIFEST_LINK_ID;
    link.rel = 'manifest';
    document.head.appendChild(link);
  }
  link.href = STAFF_MANIFEST_URL;
}

export function removeStaffManifestLink() {
  if (typeof document === 'undefined') return;
  document.head.querySelector(`#${STAFF_MANIFEST_LINK_ID}`)?.remove();
}

export async function registerStaffServiceWorker() {
  if (!canUseServiceWorker()) return null;
  if (registrationInFlight) return registrationInFlight;

  registrationInFlight = (async () => {
    watchForControllerChange();

    const existingRegistrations = await getStaffRegistrations();
    const registration = existingRegistrations[0] || await navigator.serviceWorker.register(STAFF_SW_URL, { scope: STAFF_SW_SCOPE });

    if (registration.waiting && navigator.serviceWorker.controller) {
      notifyUpdateReady(registration.waiting);
    }

    watchInstallingWorker(registration.installing);
    registration.addEventListener('updatefound', () => {
      watchInstallingWorker(registration.installing);
    });
    watchForUpdateChecks(registration);

    return registration;
  })();

  try {
    return await registrationInFlight;
  } finally {
    registrationInFlight = null;
  }
}

export async function clearStaffPwaCaches() {
  if (typeof caches === 'undefined') return;
  const cacheKeys = await caches.keys();
  await Promise.all(
    cacheKeys
      .filter((key) => key.startsWith(STAFF_CACHE_PREFIX))
      .map((key) => caches.delete(key))
  );
}

export async function unregisterStaffServiceWorker() {
  if (!canUseServiceWorker()) return;
  clearUpdateWatch();
  pendingWorker = null;
  refreshAfterControllerChange = false;

  const registrations = await getStaffRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
}

export async function cleanupStaffPwaArtifacts() {
  removeStaffManifestLink();
  if (registrationInFlight) {
    await registrationInFlight.catch(() => {});
  }
  await unregisterStaffServiceWorker();
  await clearStaffPwaCaches();
}

export async function activateWaitingServiceWorker(worker = pendingWorker) {
  if (!canUseServiceWorker()) return;
  refreshAfterControllerChange = true;

  if (worker && typeof worker.postMessage === 'function') {
    worker.postMessage({ type: 'SKIP_WAITING' });
    return;
  }

  const registrations = await getStaffRegistrations();
  registrations[0]?.waiting?.postMessage({ type: 'SKIP_WAITING' });
}
