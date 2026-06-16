const CACHE_PREFIX = 'us-staff-pwa-';
const STATIC_CACHE = `${CACHE_PREFIX}static-v1`;
const VERSIONED_ASSET_PATTERN = /^\/assets\/.+[-.][a-zA-Z0-9_-]{8,}\.(?:css|js|mjs|png|jpg|jpeg|webp|svg|woff2?)$/;

function isSameOrigin(requestUrl) {
  return requestUrl.origin === self.location.origin;
}

function isApiRequest(pathname) {
  return pathname.startsWith('/api/') || pathname === '/api' || pathname.startsWith('/socket.io/');
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html');
}

async function networkOnlyNavigation(request) {
  try {
    return await fetch(new Request(request, { cache: 'no-store' }));
  } catch {
    return new Response(
      '<!doctype html><title>Universal Systems App</title><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;background:#061426;color:#eaf6ff;font-family:system-ui,sans-serif;display:grid;min-height:100vh;place-items:center;text-align:center"><main><h1>Universal Systems App</h1><p>Please reconnect to load the latest staff workspace.</p></main></body>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 }
    );
  }
}

async function cacheVersionedAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('install', () => {
  // Updates wait for the user to click "Update & Refresh" in the app.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const requestUrl = new URL(request.url);
  if (!isSameOrigin(requestUrl) || isApiRequest(requestUrl.pathname)) return;

  if (isNavigationRequest(request)) {
    event.respondWith(networkOnlyNavigation(request));
    return;
  }

  if (VERSIONED_ASSET_PATTERN.test(requestUrl.pathname)) {
    event.respondWith(cacheVersionedAsset(request));
  }
});
