// ─── Reimbursify Service Worker ──────────────────────────────────────────────
// Strategy:
//   • Pages / JS / CSS : stale-while-revalidate  (serve cache, update in bg)
//   • GET API calls    : stale-while-revalidate  (serve cache, update in bg)
//   • Mutations        : network-first; if offline → queue in IndexedDB
//   • Connectivity     : poll every 10 s; flush queue the moment we come online
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_VERSION   = "v9";          // bump to force fresh install
const STATIC_CACHE    = `reimb-static-${CACHE_VERSION}`;
const API_CACHE       = `reimb-api-${CACHE_VERSION}`;
const SYNC_TAG        = "reimb-sync";
const DB_NAME         = "reimbursify-offline";
const DB_VERSION      = 3;
const QUEUE_STORE     = "sync-queue";
const CACHE_STORE     = "api-cache";

// ── ALL app routes to pre-cache at install ──────────────────────────────────
const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/trips",
  "/groups",
  "/responses",
  "/messages",
  "/profile",
  "/trips/analytics",
  "/admin/groups",
  "/admin/forms",
  "/admin/submissions",
  "/auth/signin",
];

// ── API routes we cache for offline reads ────────────────────────────────────
const CACHEABLE_API_PATTERNS = [
  /^\/api\/trips(\?|$)/,
  /^\/api\/trips\/[^/]+(\?|$)/,
  /^\/api\/trips\/[^/]+\/expenses(\?|$)/,
  /^\/api\/expenses(\?|$)/,
  /^\/api\/forms(\?|$)/,
  /^\/api\/forms\/[^/]+(\?|$)/,
  /^\/api\/submissions(\?|$)/,
  /^\/api\/groups(\?|$)/,
  /^\/api\/groups\/[^/]+(\?|$)/,
  /^\/api\/profile(\?|$)/,
  /^\/api\/profile\/payment-cards(\?|$)/,
];

// ── Features that require online access ──────────────────────────────────────
const ONLINE_ONLY_PATTERNS = [
  /^\/api\/messages/,
  /^\/api\/forms-builder/,
];

// ─────────────────────────────────────────────────────────────────────────────
// IndexedDB helpers (sync-queue + api-cache store)
// ─────────────────────────────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      const oldVersion = e.oldVersion;

      if (oldVersion < 3 && db.objectStoreNames.contains(QUEUE_STORE)) {
        db.deleteObjectStore(QUEUE_STORE);
      }

      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const qs = db.createObjectStore(QUEUE_STORE, { keyPath: "id", autoIncrement: true });
        qs.createIndex("createdAt", "createdAt");
      }
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: "url" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function enqueue(entry) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    tx.objectStore(QUEUE_STORE).add(entry);
    tx.oncomplete = resolve;
    tx.onerror    = () => reject(tx.error);
  });
}

async function getAllQueued() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(QUEUE_STORE, "readonly");
    const req = tx.objectStore(QUEUE_STORE).index("createdAt").getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function removeQueued(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    tx.objectStore(QUEUE_STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror    = () => reject(tx.error);
  });
}

async function putApiCache(url, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CACHE_STORE, "readwrite");
    tx.objectStore(CACHE_STORE).put({ url, data, cachedAt: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror    = () => reject(tx.error);
  });
}

async function getApiCache(url) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx  = db.transaction(CACHE_STORE, "readonly");
    const req = tx.objectStore(CACHE_STORE).get(url);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => resolve(null);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Broadcast helpers
// ─────────────────────────────────────────────────────────────────────────────
async function broadcast(msg) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((c) => c.postMessage(msg));
}

// ─────────────────────────────────────────────────────────────────────────────
// INSTALL – pre-cache all app routes
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      // Use addAll with individual catch so one failure doesn't block others
      Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Failed to pre-cache ${url}:`, err);
          })
        )
      )
    )
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVATE  – delete old caches, claim clients, trigger full cache refresh
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== STATIC_CACHE && n !== API_CACHE)
          .map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// FETCH
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // ── Skip non-GET mutations: queue them if offline ─────────────────────────
  if (request.method !== "GET") {
    // Check if this is an online-only mutation
    const isOnlineOnly = ONLINE_ONLY_PATTERNS.some((p) => p.test(url.pathname));
    if (isOnlineOnly) {
      event.respondWith(
        fetch(request).catch(() => {
          return new Response(
            JSON.stringify({ error: "This feature requires an internet connection", offline: true }),
            { status: 503, headers: { "Content-Type": "application/json" } }
          );
        })
      );
      return;
    }
    event.respondWith(handleMutation(request));
    return;
  }

  // ── Auth session: network-first, fallback to cache ────────────────────────
  if (url.pathname.startsWith("/api/auth/session")) {
    event.respondWith(
      fetch(request)
        .then(async (res) => {
          if (res.ok) {
            const clone = res.clone();
            const cache = await caches.open(API_CACHE);
            cache.put(request, clone);
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(JSON.stringify({}), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        })
    );
    return;
  }

  // ── Auth CSRF and Providers: network-first, mock fallback ──────────────────
  if (url.pathname.startsWith("/api/auth/csrf")) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ csrfToken: "offline-csrf-token" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      })
    );
    return;
  }

  if (url.pathname.startsWith("/api/auth/providers")) {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response(JSON.stringify({
          google: { id: "google", name: "Google", type: "oauth", signinUrl: "/api/auth/signin/google" },
          credentials: { id: "credentials", name: "Credentials", type: "credentials", signinUrl: "/api/auth/signin/credentials" }
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      })
    );
    return;
  }

  // ── Other auth routes: network-only ───────────────────────────────────────
  if (url.pathname.startsWith("/api/auth") || url.pathname.startsWith("/auth/")) {
    event.respondWith(fetch(request));
    return;
  }

  // ── Online-only API GET routes ────────────────────────────────────────────
  const isOnlineOnlyGet = ONLINE_ONLY_PATTERNS.some((p) => p.test(url.pathname));
  if (isOnlineOnlyGet) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: "This feature requires an internet connection", offline: true }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      })
    );
    return;
  }

  // ── Cacheable API GET: stale-while-revalidate ─────────────────────────────
  const isCacheableApi = CACHEABLE_API_PATTERNS.some((p) => p.test(url.pathname));
  if (url.pathname.startsWith("/api/") && isCacheableApi) {
    event.respondWith(apiStaleWhileRevalidate(request));
    return;
  }

  // ── Pages / static assets: stale-while-revalidate via Cache API ──────────
  event.respondWith(staticStaleWhileRevalidate(request));
});

// ─────────────────────────────────────────────────────────────────────────────
// stale-while-revalidate for API routes (uses IndexedDB so data survives clear)
// ─────────────────────────────────────────────────────────────────────────────
async function apiStaleWhileRevalidate(request) {
  const key = request.url;

  // Fire network request in background immediately
  const networkPromise = fetch(request.clone()).then(async (response) => {
    if (response.ok) {
      const clone = response.clone();
      const data  = await clone.json().catch(() => null);
      if (data !== null) {
        // Store in both IndexedDB and Cache API
        await putApiCache(key, data);
        const cache = await caches.open(API_CACHE);
        cache.put(request, response.clone()).catch(() => {});
      }
      // Notify pages that fresh data arrived
      broadcast({ type: "CACHE_UPDATED", url: key });
    }
    return response;
  }).catch(() => null);

  // Return cached version immediately if available
  const cached = await caches.match(request);
  if (cached) {
    // Still wait for network to update cache, but don't block UI
    networkPromise.catch(() => {});
    return cached;
  }

  // No cache → wait for network
  const networkResponse = await networkPromise;
  if (networkResponse) return networkResponse;

  // Truly offline fallback from IndexedDB
  const idbData = await getApiCache(key);
  if (idbData) {
    return new Response(JSON.stringify(idbData.data), {
      headers: { "Content-Type": "application/json", "X-Offline-Cache": "true" },
    });
  }

  // Last resort: empty data
  return new Response(JSON.stringify({ trips: [], forms: [], submissions: [], expenses: [], groups: [] }), {
    headers: { "Content-Type": "application/json", "X-Offline-Cache": "true" },
    status: 200,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// stale-while-revalidate for pages/assets (Cache API only)
// ─────────────────────────────────────────────────────────────────────────────
async function staticStaleWhileRevalidate(request) {
  const cached = await caches.match(request);

  const networkPromise = fetch(request.clone()).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  }).catch(() => null);

  if (cached) {
    networkPromise.catch(() => {});
    return cached;
  }

  const net = await networkPromise;
  if (net) return net;

  // Offline document fallback — serve the root page shell for any navigation
  if (request.destination === "document") {
    const root = await caches.match("/");
    if (root) return root;
  }

  return new Response("Offline", { status: 503 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutation handler (POST/PATCH/DELETE)
// ─────────────────────────────────────────────────────────────────────────────
async function handleMutation(request) {
  try {
    const response = await fetch(request.clone());
    return response;
  } catch (_) {
    // Offline – queue for later
    const body = await request.clone().text().catch(() => "{}");
    await enqueue({
      url:       request.url,
      method:    request.method,
      headers:   Object.fromEntries(request.headers.entries()),
      body,
      createdAt: Date.now(),
      synced:    false,
    });

    broadcast({ type: "MUTATION_QUEUED", url: request.url });

    return new Response(
      JSON.stringify({ queued: true, offline: true, message: "Saved offline – will sync when online" }),
      { status: 202, headers: { "Content-Type": "application/json", "X-Queued": "true" } }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Flush sync queue (called on background-sync event AND from message)
// ─────────────────────────────────────────────────────────────────────────────
async function flushSyncQueue() {
  const items = await getAllQueued();
  if (!items.length) return { flushed: 0, failed: 0 };

  let flushed = 0, failed = 0;

  for (const item of items) {
    try {
      const response = await fetch(item.url, {
        method:  item.method,
        headers: { ...item.headers, "Content-Type": "application/json" },
        body:    item.method !== "GET" ? item.body : undefined,
      });

      if (response.ok || response.status < 500) {
        await removeQueued(item.id);
        flushed++;
      } else {
        failed++;
      }
    } catch (_) {
      failed++;
      break; // Still offline – stop trying
    }
  }

  if (flushed > 0) {
    broadcast({ type: "SYNC_COMPLETE", flushed, remaining: failed });
  }

  return { flushed, failed };
}

// ─────────────────────────────────────────────────────────────────────────────
// Background sync event (browser-triggered when connectivity restored)
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(flushSyncQueue());
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Message handler (from app page)
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener("message", async (event) => {
  const { type } = event.data || {};

  if (type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (type === "FLUSH_QUEUE") {
    const result = await flushSyncQueue();
    event.ports?.[0]?.postMessage(result);
  }

  if (type === "GET_QUEUE_COUNT") {
    const items = await getAllQueued();
    event.ports?.[0]?.postMessage({ count: items.length, items });
  }

  if (type === "PRECACHE_ALL") {
    // Aggressively cache all app pages and key API data
    const cache = await caches.open(STATIC_CACHE);
    const urls = event.data.urls || PRECACHE_URLS;
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          await cache.put(url, res.clone());
        }
      } catch (_) {}
    }
    event.ports?.[0]?.postMessage({ precached: true });
  }

  if (type === "REFRESH_CACHE") {
    // Refresh key API endpoints proactively
    const urls = event.data.urls || [];
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const cache = await caches.open(API_CACHE);
          cache.put(url, res.clone());
          const data = await res.clone().json().catch(() => null);
          if (data) await putApiCache(url, data);
        }
      } catch (_) {}
    }
    event.ports?.[0]?.postMessage({ refreshed: true });
  }
});
