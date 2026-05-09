# PWA Offline-First Implementation Summary

## Overview
Reimbursify is now a **Progressive Web App (PWA)** with full offline-first support. Users can create, view, and manage reimbursement claims without internet connection, with automatic sync when online.

## Architecture

### 1. **IndexedDB Local Storage** (`src/lib/db.ts`)
- **Purpose**: Persistent local data storage that survives app restarts
- **Data Models**: 
  - Reimbursements (with sync status tracking)
  - Metadata (last sync time, etc.)
- **Key Functions**:
  - `initDB()` - Initialize local database
  - `getLocalReimbursements(userId)` - Fetch user's claims from local storage
  - `createLocalReimbursement()` - Create draft claims locally
  - `updateLocalReimbursement()` - Update claims with sync status
  - `getPendingSyncItems()` - Get items waiting to sync with server
  - `markAsSynced()` - Mark items as successfully synced
  - `clearAllData()` - Clear all local data (for logout)

**Critical Feature**: Items are marked with `syncStatus` ("pending", "synced", "error") and `localOnly` flag to track what needs syncing.

### 2. **Data Sync Engine** (`src/lib/sync.ts`)
- **Purpose**: Handles bidirectional sync between local IndexedDB and server
- **SyncQueue Class**:
  - Monitors online/offline status via `navigator.onLine` and window events
  - Auto-syncs when device comes back online
  - Provides `subscribe()` for components to listen to connectivity changes
  
- **Key Functions**:
  - `syncWithServer()` - Main sync function (uploads pending items, downloads updates)
  - `fetchAndUpdateServerData()` - Pulls latest from server
  - `resolveConflict()` - Handles data conflicts (server-wins, local-wins, merge)
  - `getSyncDiagnostics()` - Debug info about sync state

**Sync Flow**:
1. Get pending items from IndexedDB
2. For each pending item:
   - If `localOnly: true` → POST to create on server
   - If `localOnly: false` → PATCH to update on server
3. On success, mark item as synced with server ID
4. Fetch latest data from server and update local storage
5. Notify UI components of sync completion

### 3. **Service Worker** (`public/sw.js`)
- **Purpose**: Offline caching, background sync, and offline page fallback
- **Caching Strategy**:
  - **API Requests**: Network-first (try server, fallback to cache)
  - **Static Assets**: Cache-first (use local, or fetch if needed)
  - **Offline Fallback**: Return `/offline` page or empty data

- **Background Sync**: Hook for future queuing of requests while offline
- **Event Listeners**: 
  - `install` - Cache static assets
  - `activate` - Clean up old caches
  - `fetch` - Intercept requests and apply caching strategy
  - `sync` - Background sync when online
  - `message` - Listen for messages from client (SW updates, cache clearing)

### 4. **Service Worker Registration** (`src/components/ServiceWorkerRegister.tsx`)
- **Purpose**: Register SW on app load and handle updates
- **Features**:
  - Registers SW on mount with scope "/"
  - Checks for updates hourly
  - Listens for `controllerchange` events (app updated)
  - Listens for sync completion messages from SW

### 5. **Updated Dashboard** (`src/components/reimbursement-dashboard.tsx`)
- **Offline-First UI**:
  - Loads local data first on mount
  - Shows "Offline Mode" indicator when disconnected
  - Shows sync status badges on items ("Pending Sync", "(local)")
  - Different styling for unsynced items
  - "Retry Sync" button for manual sync

- **Smart Form Handling**:
  - When online: Try server first, fall back to local on error
  - When offline: Save to local IndexedDB immediately
  - Shows toast messages: "✓ Saved offline - will sync when online"

- **Submit Re-sends**:
  - Offline: Mark as "pendingSync", will send when online
  - Online: Immediately send status change to server, update local

### 6. **Offline Page** (`src/app/offline/page.tsx`)
- **Purpose**: User-friendly fallback when network is unavailable
- **Features**:
  - Explains what users can do offline (view, create claims)
  - "Back to App" link to return
  - "Reconnect" button to retry connection
  - Friendly messaging with tips

### 7. **Web App Manifest** (`public/manifest.json`)
- **Purpose**: PWA installation metadata
- **Contents**:
  - App name, icons, theme colors
  - `display: "standalone"` for app-like experience
  - Maskable icon support for modern devices

## Data Flow

### Creating a Claim (Offline)
```
User fills form → Submit
  ↓
Check if online?
  ├─ YES: POST /api/reimbursements
  │   ├─ Success? Save to IndexedDB + show success
  │   └─ Fail? Save to IndexedDB locally (mark pending)
  └─ NO: Save to IndexedDB immediately (mark localOnly + pending)
  ↓
UI shows claim with "(local)" and "Pending Sync" badge
```

### Auto-Sync When Coming Online
```
User comes online
  ↓
Service Worker detects "online" event
  ↓
SyncQueue notifies dashboard component
  ↓
Dashboard calls syncWithServer()
  ↓
For each pending item:
  ├─ POST new items (localOnly: true)
  ├─ PATCH existing items
  ├─ Mark as synced with server ID
  └─ Remove local flag
  ↓
Fetch latest from server → Update IndexedDB
  ↓
Show "✓ Synced X items"
```

### Submitting a Claim (Status Change)
```
User clicks "Submit"
  ↓
Check if online?
  ├─ YES: PATCH /api/reimbursements/{id} with status=SUBMITTED
  │   └─ Success? Update local + show "✓ Claim submitted"
  └─ NO: Update local with syncStatus=pending
       └─ Show "✓ Marked for submission - will sync when online"
```

## User Experience

### Online Mode
- All changes immediately sync to server
- Green success messages after operations
- Fast feedback on form submission
- No visual indicators (normal experience)

### Offline Mode
- Red "🔴 Offline Mode" banner at top
- All claims still visible and editable
- Creating claims saves to local storage
- Status badges show "(local)" and "Pending Sync"
- "Retry Sync" button for manual attempts
- Toast messages explain what's happening

### Coming Back Online
- Orange sync message appears: "✓ Synced X items"
- Offline badge disappears
- All pending changes automatically uploaded
- Fresh data from server downloaded
- Seamless transition - user doesn't need to do anything

## Zero Data Loss Guarantees

1. **IndexedDB Persistence**: All data stored locally survives app restarts
2. **Sync Status Tracking**: Every item knows if it's been synced
3. **Duplicate Prevention**: Using local IDs for drafts, server IDs after sync
4. **Conflict Resolution**: Server-wins strategy by default
5. **Backup Available**: `getAllData()` export function for debugging
6. **Clear Offline Indicators**: User always knows what's local vs synced

## Browser Support
- Works on all modern browsers with:
  - Services Worker API
  - IndexedDB
  - Cache API
  - Background Sync API (when available)

## Testing Checklist
- [ ] Create claim online → syncs immediately
- [ ] Create claim offline → shows local badge, syncs when online
- [ ] Edit claim offline → changes saved locally
- [ ] Submit claim offline → marked as pending, sent when online
- [ ] Disconnect network → shows offline indicator
- [ ] Reconnect network → auto-sync happens
- [ ] Delete browser data → local storage cleared on logout
- [ ] Refresh page offline → data still visible
- [ ] Service Worker installed → check DevTools > Application > Service Workers

## Future Enhancements
1. Conflict resolution UI (if server version differs from local)
2. Data export/backup functionality
3. Offline-first approval workflow
4. Push notifications for approval status
5. Advanced sync queue with retry logic
6. Attachment/receipt image offline storage
7. Notification when sync completes

## Development Commands
```bash
npm run dev     # Start dev server (running on :3002)
npm run build   # Production build
npm run lint    # Check code quality
```

## Architecture Files Summary
| File | Purpose | Type |
|------|---------|------|
| `src/lib/db.ts` | IndexedDB operations | Core |
| `src/lib/sync.ts` | Sync engine & connectivity | Core |
| `public/sw.js` | Service Worker | Core |
| `src/components/ServiceWorkerRegister.tsx` | SW initialization | Core |
| `src/components/reimbursement-dashboard.tsx` | UI with offline support | UI |
| `src/app/offline/page.tsx` | Offline fallback page | UI |
| `public/manifest.json` | PWA metadata | Config |
| `src/app/layout.tsx` | Root layout (registers SW) | Config |
