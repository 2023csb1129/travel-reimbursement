"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowInstallBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  if (!showInstallBanner) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "1rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10000,
        background: "var(--bg-primary)",
        border: "1px solid var(--border)",
        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
        borderRadius: "0.75rem",
        padding: "1rem 1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "1.5rem",
        width: "max-content",
        maxWidth: "90vw",
        animation: "slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
          Install Reimbursify
        </h4>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Get faster access and seamless offline support.
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={handleInstallClick}
          style={{
            background: "var(--primary)",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.5rem 1rem",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <Download size={16} /> Install App
        </button>
        <button
          onClick={() => setShowInstallBanner(false)}
          style={{
            background: "transparent",
            color: "var(--text-muted)",
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.5rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>
      </div>
      <style>{`
        @keyframes slideDown {
          from { transform: translate(-50%, -150%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
