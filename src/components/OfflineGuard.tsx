"use client";

import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

/**
 * OfflineGuard – wraps pages that require internet.
 * Shows a clean offline message when no connection is detected.
 */
export function OfflineGuard({
  children,
  featureName = "This feature",
}: {
  children: React.ReactNode;
  featureName?: string;
}) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);

    // Also poll to be safe
    const poll = setInterval(() => {
      setIsOnline(navigator.onLine);
    }, 5000);

    return () => {
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
      clearInterval(poll);
    };
  }, []);

  if (!isOnline) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "4rem 2rem",
        textAlign: "center",
        minHeight: "60vh",
      }}>
        <div style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #fef3c7, #fde68a)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "1.5rem",
          boxShadow: "0 8px 24px rgba(245, 158, 11, 0.2)",
        }}>
          <WifiOff size={36} color="#92400e" />
        </div>
        <h2 style={{
          fontSize: "1.5rem",
          fontWeight: 800,
          color: "var(--text-primary)",
          margin: "0 0 0.75rem",
        }}>
          You&apos;re Offline
        </h2>
        <p style={{
          fontSize: "1rem",
          color: "var(--text-muted)",
          margin: "0 0 1rem",
          maxWidth: "400px",
          lineHeight: 1.6,
        }}>
          {featureName} requires an internet connection. Your trips and expenses are still available offline.
        </p>
        <div style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}>
          <span style={{
            padding: "0.4rem 0.8rem",
            background: "#dcfce7",
            color: "#16a34a",
            borderRadius: "9999px",
            fontSize: "0.8rem",
            fontWeight: 700,
          }}>
            ✓ Trips available
          </span>
          <span style={{
            padding: "0.4rem 0.8rem",
            background: "#dcfce7",
            color: "#16a34a",
            borderRadius: "9999px",
            fontSize: "0.8rem",
            fontWeight: 700,
          }}>
            ✓ Expenses available
          </span>
          <span style={{
            padding: "0.4rem 0.8rem",
            background: "#fef3c7",
            color: "#92400e",
            borderRadius: "9999px",
            fontSize: "0.8rem",
            fontWeight: 700,
          }}>
            ⏳ Syncs when online
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
