// Data sync utility for offline-first PWA
// Handles syncing local IndexedDB data with server when online

import React from "react";
import { 
  getLocalReimbursements, 
  getPendingSyncItems, 
  markAsSynced,
  updateLocalReimbursement,
  getMetadata,
  setMetadata,
  saveReimbursementsLocally
} from "./db";

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors?: string[];
  timestamp: string;
}

// Queue for managing sync operations
class SyncQueue {
  private isOnline = typeof navigator !== "undefined" && navigator.onLine;
  private listeners: ((online: boolean) => void)[] = [];
  private syncInProgress = false;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleOnline());
      window.addEventListener("offline", () => this.handleOffline());
    }
  }

  private handleOnline() {
    if (!this.isOnline) {
      this.isOnline = true;
      this.notifyListeners(true);
      this.processSync(); // Auto-sync when coming online
    }
  }

  private handleOffline() {
    this.isOnline = false;
    this.notifyListeners(false);
  }

  subscribe(listener: (online: boolean) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(online: boolean) {
    this.listeners.forEach((listener) => listener(online));
  }

  getOnlineStatus() {
    return this.isOnline;
  }

  async processSync() {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;
    try {
      await syncWithServer();
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      this.syncInProgress = false;
    }
  }

  async manualSync() {
    return this.processSync();
  }
}

export const syncQueue = new SyncQueue();

// Main sync function
export async function syncWithServer(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  };

  if (!syncQueue.getOnlineStatus()) {
    result.success = false;
    result.errors?.push("Device is offline");
    return result;
  }

  try {
    // Get pending items from local storage
    const pendingItems = await getPendingSyncItems();

    if (pendingItems.length === 0) {
      // Just fetch latest from server and update local
      await fetchAndUpdateServerData();
      result.synced = 0;
      result.success = true;
      return result;
    }

    // Sync each pending item to server
    for (const item of pendingItems) {
      try {
        if (item.localOnly) {
          // Create new on server
          const response = await fetch("/api/reimbursements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: item.title,
              amount: item.amount,
              category: item.category,
              status: item.status,
              notes: item.category, // Using category as notes for now
            }),
          });

          if (response.ok) {
            const created = await response.json();
            await markAsSynced(item.id, created.id);
            result.synced++;
          } else {
            throw new Error(`Server error: ${response.status}`);
          }
        } else {
          // Update existing on server
          const response = await fetch(`/api/reimbursements/${item.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: item.title,
              amount: item.amount,
              category: item.category,
              status: item.status,
            }),
          });

          if (response.ok) {
            await updateLocalReimbursement(item.id, {
              syncStatus: "synced",
            });
            result.synced++;
          } else {
            throw new Error(`Server error: ${response.status}`);
          }
        }
      } catch (error) {
        result.failed++;
        result.errors?.push(
          `Failed to sync item ${item.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    // After syncing local changes, fetch latest from server
    await fetchAndUpdateServerData();

    result.success = result.failed === 0;
    await setMetadata("lastSync", result.timestamp);

    return result;
  } catch (error) {
    result.success = false;
    result.errors?.push(
      `Sync process failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return result;
  }
}

// Fetch latest data from server and update local storage
async function fetchAndUpdateServerData(): Promise<void> {
  try {
    const response = await fetch("/api/reimbursements");

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const serverData = await response.json();
    const reimbursements = Array.isArray(serverData) 
      ? serverData 
      : serverData.data || [];

    // Save to local storage
    await saveReimbursementsLocally(reimbursements);
  } catch (error) {
    console.warn(
      "Failed to fetch server data:",
      error instanceof Error ? error.message : "Unknown error"
    );
    // Continue with local data if fetch fails
  }
}

// Hook for React components to sync when coming online
export function useSyncListener(callback?: (online: boolean) => void) {
  if (typeof window === "undefined") {
    return { isOnline: false, sync: async () => ({}) };
  }

  const [isOnline, setIsOnline] = React.useState(syncQueue.getOnlineStatus());

  React.useEffect(() => {
    const unsubscribe = syncQueue.subscribe((online) => {
      setIsOnline(online);
      callback?.(online);
    });

    return unsubscribe;
  }, [callback]);

  const manualSync = React.useCallback(async () => {
    return syncQueue.manualSync();
  }, []);

  return { isOnline, sync: manualSync };
}

// Conflict resolution utilities
export function resolveConflict(
  local: any,
  server: any,
  strategy: "server-wins" | "local-wins" | "merge" = "server-wins"
): any {
  switch (strategy) {
    case "server-wins":
      return server;
    case "local-wins":
      return local;
    case "merge":
      // Merge by keeping newer values
      const merged = { ...server };
      Object.keys(local).forEach((key) => {
        if (local[key] && new Date(local.updatedAt) > new Date(server.updatedAt)) {
          merged[key] = local[key];
        }
      });
      return merged;
    default:
      return server;
  }
}

// Export diagnostic info
export async function getSyncDiagnostics() {
  return {
    isOnline: syncQueue.getOnlineStatus(),
    lastSync: await getMetadata("lastSync"),
    pendingItems: await getPendingSyncItems(),
    timestamp: new Date().toISOString(),
  };
}
