"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  cacheTrips,
  cacheExpenses,
  cacheForms,
  cacheSubmissions,
  cacheGroups,
  flushSyncQueue,
  getSyncQueue,
} from "@/lib/offline-db";

// ── How often to poll connectivity (ms) ──────────────────────────────────────
const POLL_INTERVAL     = 15_000;  // 15 s – lightweight manifest ping
const CACHE_REFRESH_INT = 60_000;  // refresh IndexedDB cache every 60 s

export type OnlineStatus = "online" | "offline" | "syncing";

// Context so any component can check online status
let _globalOnlineStatus: OnlineStatus = "online";
export function getOnlineStatus(): OnlineStatus { return _globalOnlineStatus; }

// ─────────────────────────────────────────────────────────────────────────────

export function ServiceWorkerRegister() {
  const [status,        setStatus]     = useState<OnlineStatus>("online");
  const [queueCount,    setQueueCount] = useState(0);
  const [syncMsg,       setSyncMsg]    = useState("");
  const [showBanner,    setShowBanner] = useState(false);
  const bannerTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOnlineRef     = useRef(true);
  const swRef           = useRef<ServiceWorkerRegistration | null>(null);
  const hasPrecached    = useRef(false);

  // Keep global status in sync
  useEffect(() => { _globalOnlineStatus = status; }, [status]);

  // ── Register SW ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        swRef.current = reg;
        // Check for SW updates every 5 min
        setInterval(() => reg.update(), 5 * 60_000);

        // After registration, trigger aggressive pre-cache of all pages
        if (!hasPrecached.current && navigator.onLine) {
          hasPrecached.current = true;
          setTimeout(() => precacheAllRoutes(), 3000);
        }
      })
      .catch((err) => console.warn("[PWA] SW registration failed:", err));

    // Listen for SW messages
    navigator.serviceWorker.addEventListener("message", async (event) => {
      const { type } = event.data || {};

      if (type === "SYNC_COMPLETE") {
        const remaining = await getSyncQueue();
        setQueueCount(remaining.length);
        if (event.data.flushed > 0) {
          showBannerMsg(`✅ ${event.data.flushed} change(s) synced`, "online");
        }
      }

      if (type === "MUTATION_QUEUED") {
        const q = await getSyncQueue();
        setQueueCount(q.length);
        showBannerMsg(`📥 Saved offline (${q.length} pending)`, "offline");
      }
    });
  }, []);  

  // ── Pre-cache all app routes aggressively when online ──────────────────────
  const precacheAllRoutes = useCallback(() => {
    if (!navigator.serviceWorker.controller) return;
    const channel = new MessageChannel();
    navigator.serviceWorker.controller.postMessage(
      {
        type: "PRECACHE_ALL",
        urls: [
          "/", "/trips", "/groups", "/responses", "/messages", "/profile",
          "/trips/analytics", "/admin/groups", "/admin/forms", "/admin/submissions",
          "/auth/signin", "/manifest.json",
        ],
      },
      [channel.port2]
    );
  }, []);

  // ── Connectivity check using manifest.json (static, no auth) ───────────────
  const checkConnectivity = useCallback(async () => {
    try {
      const res = await fetch(`/manifest.json?_=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
      });
      handleConnectivityChange(res.ok);
    } catch {
      handleConnectivityChange(false);
    }
  }, []);  

  const handleConnectivityChange = useCallback(async (nowOnline: boolean) => {
    const wasOnline = isOnlineRef.current;
    isOnlineRef.current = nowOnline;

    if (nowOnline && !wasOnline) {
      // Just came back online
      setStatus("syncing");
      showBannerMsg("🔄 Back online — syncing changes…", "syncing");
      await doSync();
      // Re-cache everything when back online
      setTimeout(() => {
        precacheAllRoutes();
        refreshLocalCache();
      }, 2000);
    } else if (!nowOnline && wasOnline) {
      // Just went offline
      const q = await getSyncQueue();
      setQueueCount(q.length);
      setStatus("offline");
      showBannerMsg("📴 Offline — changes saved locally", "offline");
    } else if (!nowOnline) {
      setStatus("offline");
    }
  }, []);  

  useEffect(() => {
    // Initial check
    checkConnectivity();

    const poll = setInterval(checkConnectivity, POLL_INTERVAL);

    const goOnline  = () => handleConnectivityChange(true);
    const goOffline = () => handleConnectivityChange(false);
    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      clearInterval(poll);
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [checkConnectivity, handleConnectivityChange]);

  // ── Full cache refresh (trips + expenses for ALL trips + forms + submissions)
  useEffect(() => {
    const refresh = async () => {
      if (!isOnlineRef.current) return;
      await refreshLocalCache();
    };

    // Initial warm-up after a short delay so it doesn't compete with page load
    const warmup = setTimeout(refresh, 4000);
    const interval = setInterval(refresh, CACHE_REFRESH_INT);

    return () => {
      clearTimeout(warmup);
      clearInterval(interval);
    };
  }, []);  

  // ── Sync flush ──────────────────────────────────────────────────────────────
  const doSync = useCallback(async () => {
    const q = await getSyncQueue();
    if (!q.length) {
      setStatus("online");
      setQueueCount(0);
      showBannerMsg("✅ All changes synced", "online");
      return;
    }

    setSyncMsg(`Syncing ${q.length} offline change(s)…`);
    setStatus("syncing");

    if (navigator.serviceWorker.controller) {
      const channel = new MessageChannel();
      channel.port1.onmessage = async (e) => {
        const remaining = await getSyncQueue();
        setQueueCount(remaining.length);
        setStatus(remaining.length === 0 ? "online" : "offline");
        if (e.data.flushed > 0) {
          showBannerMsg(`✅ ${e.data.flushed} change(s) synced`, "online");
          setTimeout(refreshLocalCache, 1000);
        }
      };
      navigator.serviceWorker.controller.postMessage({ type: "FLUSH_QUEUE" }, [channel.port2]);
    } else {
      const result = await flushSyncQueue();
      const remaining = await getSyncQueue();
      setQueueCount(remaining.length);
      setStatus(remaining.length === 0 ? "online" : "offline");
      if (result.flushed > 0) {
        showBannerMsg(`✅ ${result.flushed} change(s) synced`, "online");
      }
    }
  }, []);  

  // Background sync API
  useEffect(() => {
    const tryBgSync = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        if ("sync" in reg) await (reg as any).sync.register("reimb-sync");
      } catch (_) {}
    };
    if (typeof window !== "undefined") {
      window.addEventListener("online", tryBgSync);
      return () => window.removeEventListener("online", tryBgSync);
    }
  }, []);

  // ── Banner helpers ──────────────────────────────────────────────────────────
  const showBannerMsg = (msg: string, st: OnlineStatus) => {
    setSyncMsg(msg);
    setStatus(st);
    setShowBanner(true);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    if (st === "online") {
      bannerTimerRef.current = setTimeout(() => setShowBanner(false), 4000);
    }
  };

  // ── Refresh local IndexedDB – cache ALL trips and ALL their expenses ───────
  const refreshLocalCache = async () => {
    try {
      const [tripsRes, formsRes, subsRes, groupsRes] = await Promise.allSettled([
        fetch("/api/trips?archived=true"),
        fetch("/api/forms?active=true"),
        fetch("/api/submissions"),
        fetch("/api/groups"),
      ]);

      let trips: any[] = [];

      if (tripsRes.status === "fulfilled" && tripsRes.value.ok) {
        const d = await tripsRes.value.json().catch(() => null);
        if (d?.trips) {
          trips = d.trips;
          await cacheTrips(d.trips);
        }
      }

      if (formsRes.status === "fulfilled" && formsRes.value.ok) {
        const d = await formsRes.value.json().catch(() => null);
        if (d?.forms) await cacheForms(d.forms);
      }

      if (subsRes.status === "fulfilled" && subsRes.value.ok) {
        const d = await subsRes.value.json().catch(() => null);
        if (d?.submissions) await cacheSubmissions(d.submissions);
      }

      if (groupsRes.status === "fulfilled" && groupsRes.value.ok) {
        const d = await groupsRes.value.json().catch(() => null);
        if (d?.groups) await cacheGroups(d.groups);
      }

      // Proactively cache session for offline auth
      try {
        const sessionRes = await fetch("/api/auth/session");
        if (sessionRes.ok) {
          const cache = await caches.open("reimb-api-v9");
          await cache.put("/api/auth/session", sessionRes.clone());
        }
      } catch (_) {}

      // Cache expenses for ALL trips (not just 5) — these are critical for offline
      for (const trip of trips) {
        try {
          const expRes = await fetch(`/api/trips/${trip.id}/expenses`);
          if (expRes.ok) {
            const ed = await expRes.json().catch(() => null);
            if (ed?.expenses) {
              await cacheExpenses(ed.expenses.map((e: any) => ({ ...e, tripId: trip.id })));
            }
          }
        } catch (_) {}
      }
    } catch (_) {}
  };

  // ── Render banner ───────────────────────────────────────────────────────────
  if (!showBanner && status === "online" && queueCount === 0) return null;

  const bg =
    status === "offline" ? "#7f1d1d" :
    status === "syncing" ? "#1e3a5f" :
    "#14532d";

  const icon =
    status === "offline" ? "📴" :
    status === "syncing" ? "🔄" : "✅";

  return (
    <div
      style={{
        position:     "fixed",
        bottom:       "1rem",
        left:         "50%",
        transform:    "translateX(-50%)",
        zIndex:       9999,
        background:   bg,
        color:        "white",
        padding:      "0.65rem 1.5rem",
        borderRadius: "2rem",
        fontSize:     "0.85rem",
        fontWeight:   600,
        display:      "flex",
        alignItems:   "center",
        gap:          "0.5rem",
        boxShadow:    "0 4px 20px rgba(0,0,0,0.35)",
        animation:    "slideUpFade 0.3s ease",
        maxWidth:     "90vw",
        whiteSpace:   "nowrap",
      }}
    >
      <span>{icon}</span>
      <span>
        {status === "offline" && queueCount > 0
          ? `Offline — ${queueCount} change(s) pending sync`
          : status === "offline"
          ? "Offline — trips & expenses available"
          : syncMsg || (status === "syncing" ? "Syncing…" : "All changes synced")}
      </span>
      {queueCount > 0 && status !== "offline" && (
        <span style={{ background: "rgba(255,255,255,0.2)", padding: "0.1rem 0.5rem", borderRadius: "1rem", fontSize: "0.75rem" }}>
          {queueCount} pending
        </span>
      )}
      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateX(-50%) translateY(1rem); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
