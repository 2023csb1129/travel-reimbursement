"use client";

import Link from "next/link";

export default function OfflinePage() {
  const handleButtonHover = (e: React.MouseEvent<HTMLButtonElement>, entering: boolean) => {
    (e.target as HTMLButtonElement).style.opacity = entering ? "0.8" : "1";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary)",
        padding: "1rem",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: "500px",
        }}
      >
        <div
          style={{
            fontSize: "4rem",
            marginBottom: "1rem",
          }}
        >
          📡
        </div>

        <h1
          style={{
            fontSize: "2rem",
            fontWeight: "bold",
            marginBottom: "1rem",
            color: "var(--text-primary)",
          }}
        >
          You're Offline
        </h1>

        <p
          style={{
            fontSize: "1rem",
            color: "var(--text-muted)",
            marginBottom: "2rem",
            lineHeight: "1.6",
          }}
        >
          You've lost your internet connection, but don't worry! Your data is safely stored locally on your device.
        </p>

        <div
          style={{
            background: "var(--bg-glass)",
            border: "1px solid var(--border)",
            borderRadius: "0.75rem",
            padding: "1.5rem",
            marginBottom: "2rem",
            textAlign: "left",
          }}
        >
          <h2
            style={{
              fontSize: "0.95rem",
              fontWeight: "600",
              marginBottom: "1rem",
              color: "var(--text-primary)",
            }}
          >
            ✓ What you can do offline:
          </h2>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
            }}
          >
            <li
              style={{
                color: "var(--text-muted)",
                marginBottom: "0.75rem",
                paddingLeft: "1.5rem",
                position: "relative",
              }}
            >
              <span style={{ position: "absolute", left: 0 }}>✓</span>
              View your reimbursement claims
            </li>
            <li
              style={{
                color: "var(--text-muted)",
                marginBottom: "0.75rem",
                paddingLeft: "1.5rem",
                position: "relative",
              }}
            >
              <span style={{ position: "absolute", left: 0 }}>✓</span>
              Create new claims as drafts
            </li>
            <li
              style={{
                color: "var(--text-muted)",
                paddingLeft: "1.5rem",
                position: "relative",
              }}
            >
              <span style={{ position: "absolute", left: 0 }}>✓</span>
              All changes sync automatically when you're back online
            </li>
          </ul>
        </div>

        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "1fr 1fr",
          }}
        >
          <Link
            href="/"
            style={{
              padding: "0.75rem 1.5rem",
              background: "var(--accent-primary)",
              color: "var(--bg-primary)",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "0.9rem",
              fontWeight: "600",
              textDecoration: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "opacity 0.2s ease",
            }}
          >
            Back to App
          </Link>

          <button
            onClick={() => window.location.reload()}
            onMouseEnter={(e) => handleButtonHover(e, true)}
            onMouseLeave={(e) => handleButtonHover(e, false)}
            style={{
              padding: "0.75rem 1.5rem",
              background: "var(--bg-glass)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              fontSize: "0.9rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "opacity 0.2s ease",
            }}
          >
            Reconnect
          </button>
        </div>

        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            marginTop: "2rem",
          }}
        >
          💡 Tip: Reimbursify works offline by default. Create and edit your claims anywhere, anytime!
        </p>
      </div>
    </div>
  );
}
