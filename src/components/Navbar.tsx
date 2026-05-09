"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <nav style={{ padding: "1rem 2rem", background: "var(--bg-glass)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Loading...</div>
      </nav>
    );
  }

  return (
    <nav style={{ padding: "1rem 2rem", background: "var(--gradient-primary)", borderBottom: "none", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 20px rgba(109, 40, 217, 0.15)" }}>
      {/* Logo */}
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
        <span style={{ fontSize: "1.25rem", fontWeight: "900", color: "white", letterSpacing: "-0.5px" }}>Reimbursify</span>
      </Link>

      {/* Right Side */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        {session?.user ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.9rem", color: "white", fontWeight: "700", letterSpacing: "0.3px" }}>
                  {session.user.name || session.user.email?.split("@")[0]}
                </div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
                  {session.user.role === "ADMINISTRATOR" ? "👨‍💼 Admin" : "💼 Submitter"}
                </div>
              </div>
            </div>
            <button
              onClick={() => signOut({ redirect: true, callbackUrl: "/auth/signin" })}
              style={{
                padding: "0.625rem 1.25rem",
                fontSize: "0.85rem",
                fontWeight: "700",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: "0.75rem",
                cursor: "pointer",
                transition: "all 0.2s",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                backdropFilter: "blur(10px)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.3)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.2)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
              }}
            >
              Sign Out
            </button>
          </>
        ) : (
          <Link
            href="/auth/signin"
            style={{
              padding: "0.625rem 1.5rem",
              fontSize: "0.85rem",
              fontWeight: "700",
              background: "white",
              color: "var(--primary)",
              border: "none",
              borderRadius: "0.75rem",
              cursor: "pointer",
              textDecoration: "none",
              transition: "all 0.2s",
              display: "inline-block",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(139, 92, 246, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
