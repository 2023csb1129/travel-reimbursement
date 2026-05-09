"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

interface ActionButton {
  label: string;
  onClick: () => void;
  icon?: string;
}

interface HeaderProps {
  title: string;
  showAuthButtons?: boolean;
  actionButtons?: ActionButton[];
  hideLogoTitle?: boolean;
}

export function Header({ title, showAuthButtons = true, actionButtons = [], hideLogoTitle = false }: HeaderProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  return (
    <header
      style={{
        padding: "1.5rem 2rem",
        background: "white",
        borderBottom: "1px solid #d1e8dd",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
      }}
    >
      {/* Left Side - Logo and Title */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {!hideLogoTitle && (
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              textDecoration: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ backgroundColor: "#1b5e3f", color: "white", padding: "0.35rem 0.75rem", borderRadius: "0.375rem", fontSize: "1.5rem", fontWeight: "900" }}>
                ₹$
              </div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: "900", margin: 0, color: "#1b5e3f" }}>
                Reimbursify
              </h1>
            </div>
          </Link>
        )}
        {title && (
          <div key={title} className="animate-fade-in" style={{ fontSize: "1.1rem", color: "#5a6f6a", fontWeight: "600", marginLeft: "2rem", animationDuration: "0.5s" }}>
            {title}
          </div>
        )}
      </div>

      {/* Right Side - Buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {/* Action Buttons - Vertical List */}
        {actionButtons.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {actionButtons.map((btn, idx) => (
              <button
                key={idx}
                onClick={btn.onClick}
                style={{
                  padding: "0.75rem 1.25rem",
                  fontSize: "0.85rem",
                  fontWeight: "700",
                  background: "var(--gradient-primary)",
                  color: "white",
                  border: "none",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: "0 2px 8px rgba(27, 94, 63, 0.15)",
                  whiteSpace: "nowrap",
                  minWidth: "120px",
                  textAlign: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(27, 94, 63, 0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(27, 94, 63, 0.15)";
                }}
              >
                {btn.icon && <span style={{ marginRight: "0.5rem" }}>{btn.icon}</span>}
                {btn.label}
              </button>
            ))}
          </div>
        )}

        {/* Vertical Divider */}
        {actionButtons.length > 0 && showAuthButtons && (
          <div style={{ width: "1px", height: "2rem", background: "#d1e8dd" }} />
        )}

        {/* User Info - Top Right */}
        {session?.user && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginLeft: "1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: "700", color: "#111827" }}>
                {session.user.name || "User"}
              </span>
              <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                {session.user.email}
              </span>
            </div>
            <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "9999px", background: "var(--gradient-primary)", color: "white", fontWeight: "bold", fontSize: "0.875rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
              {session.user.name ? session.user.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() : "U"}
            </div>
          </div>
        )}

        {/* Auth Buttons */}
        {showAuthButtons && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "flex-end" }}>
            {session?.user ? (
              <>
                <span style={{ color: "#5a6f6a", fontWeight: "600", fontSize: "0.85rem", padding: "0.25rem 0" }}>
                  {session.user.email || "User"}
                </span>
                <button
                  onClick={handleSignOut}
                  style={{
                    padding: "0.75rem 1.25rem",
                    fontSize: "0.85rem",
                    fontWeight: "700",
                    background: "#f8fbfa",
                    color: "#1b5e3f",
                    border: "2px solid #d1e8dd",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    minWidth: "120px",
                    textAlign: "center",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#1b5e3f";
                    e.currentTarget.style.background = "#d1e8dd";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#d1e8dd";
                    e.currentTarget.style.background = "#f8fbfa";
                  }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <Link
                  href="/auth/signin"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0.75rem 1.25rem",
                    fontSize: "0.85rem",
                    fontWeight: "700",
                    background: "white",
                    color: "#1b5e3f",
                    border: "2px solid #1b5e3f",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    textDecoration: "none",
                    transition: "all 0.2s",
                    minWidth: "100px",
                    textAlign: "center",
                    boxSizing: "border-box",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#e8f5f1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "white";
                  }}
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signin?mode=signup"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0.75rem 1.25rem",
                    fontSize: "0.85rem",
                    fontWeight: "700",
                    background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
                    color: "white",
                    border: "2px solid transparent",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    textDecoration: "none",
                    transition: "all 0.2s",
                    minWidth: "100px",
                    textAlign: "center",
                    boxSizing: "border-box",
                    boxShadow: "0 2px 8px rgba(3, 105, 161, 0.25)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(3, 105, 161, 0.35)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(3, 105, 161, 0.25)";
                  }}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
