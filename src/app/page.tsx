"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Header } from "@/components/header";
import Link from "next/link";


export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect users
  useEffect(() => {
    if (status === "authenticated") {
      if (session?.user?.role === "ADMINISTRATOR") {
        router.push("/admin/groups");
      } else {
        router.push("/trips");
      }
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <main style={{ padding: "4rem 2rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </main>
    );
  }

  if (!session) {
    const features = [
      { icon: "📋", title: "Smart Claims", desc: "Effortless expense tracking with intelligent categorization" },
      { icon: "✓", title: "Instant Status", desc: "Real-time approval workflows and notifications" },
      { icon: "🔐", title: "Secure & Safe", desc: "Bank-level encryption for all transactions" },
      { icon: "⚡", title: "Lightning Fast", desc: "Instant synchronization across all devices" },
    ];

    return (
      <main style={{ minHeight: "100vh", background: "#fafbfa", display: "flex", flexDirection: "column" }}>
        <Header title="" showAuthButtons={true} />

        {/* Main Content Area - Sidebar + Hero */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Left Sidebar - Features */}
          <div style={{ 
            width: "120px", 
            background: "#ffffff", 
            borderRight: "1px solid #e5e7eb",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem 0 15vh 0",
            gap: "1rem"
          }}>
            {features.map((feature, idx) => (
              <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                <div
                  style={{
                    fontSize: "2.5rem",
                    padding: "1rem",
                    background: "transparent",
                    borderRadius: "50%",
                    cursor: "default",
                    transition: "all 0.3s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f0f9f7";
                    e.currentTarget.style.transform = "scale(1.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                  title={feature.title}
                >
                  {feature.icon}
                </div>
                {idx < features.length - 1 && (
                  <div style={{ 
                    width: "1px", 
                    height: "1.5rem", 
                    background: "#d1e8dd",
                    margin: "0"
                  }} />
                )}
              </div>
            ))}
          </div>

          {/* Right Main Content - Hero Section */}
          <div style={{ 
            flex: 1, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            padding: "4rem 4rem 15vh 4rem",
            gap: "6rem",
            flexWrap: "wrap",
            overflowY: "auto"
          }}>
            {/* Left Container */}
            <div style={{ flex: "1 1 400px", maxWidth: "550px", textAlign: "left" }}>
              <h1 style={{
                fontSize: "4rem",
                fontWeight: "900",
                margin: "0 0 1.5rem",
                color: "var(--text-primary)",
                lineHeight: "1.1",
                letterSpacing: "-1px",
              }}>
                <span style={{ background: "var(--gradient-primary)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  ₹EIMBUR$IFY
                </span><br />
                <span style={{ fontSize: "2.5rem", opacity: 0.75 }}>Expense Management Portal</span>
              </h1>
              <p style={{ fontSize: "1.25rem", color: "#5a6f6a", margin: "0", fontWeight: "500", lineHeight: "1.6" }}>
                Streamline your reimbursement process with our modern platform. Smart tracking, instant workflows, and secure transactions.
              </p>
            </div>

            {/* Right Container */}
            <div style={{ flex: "1 1 400px", maxWidth: "500px", display: "flex", flexDirection: "column", gap: "3rem", textAlign: "left" }}>
              {/* CTA Buttons */}
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <Link
                  href="/auth/signin?mode=signup"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "1.125rem 2.5rem",
                    fontSize: "1rem",
                    fontWeight: "700",
                    background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "0.75rem",
                    cursor: "pointer",
                    textDecoration: "none",
                    transition: "all 0.3s",
                    boxShadow: "0 8px 24px rgba(3, 105, 161, 0.3)",
                    textAlign: "center",
                    letterSpacing: "0.5px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = "0 12px 32px rgba(3, 105, 161, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(3, 105, 161, 0.3)";
                  }}
                >
                  Get Started Free <span style={{ marginLeft: "0.5rem" }}>→</span>
                </Link>
                <Link
                  href="/auth/signin"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "1.125rem 2.5rem",
                    fontSize: "1rem",
                    fontWeight: "700",
                    background: "white",
                    color: "var(--primary)",
                    border: "2px solid var(--primary-lighter)",
                    borderRadius: "0.75rem",
                    cursor: "pointer",
                    textDecoration: "none",
                    transition: "all 0.3s",
                    boxShadow: "0 2px 8px rgba(27, 94, 63, 0.1)",
                    textAlign: "center",
                    letterSpacing: "0.5px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--primary)";
                    e.currentTarget.style.background = "var(--primary-lightest)";
                    e.currentTarget.style.transform = "translateY(-3px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--primary-lighter)";
                    e.currentTarget.style.background = "white";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  Sign In
                </Link>
              </div>

              <div>
                <h2 style={{ fontSize: "2rem", fontWeight: "800", color: "#1f2937", marginBottom: "1rem" }}>
                  Everything You Need
                </h2>
                <p style={{ color: "#5a6f6a", fontSize: "1.1rem", lineHeight: "1.6", margin: 0 }}>
                  A comprehensive toolkit for running your trip expenses and reimbursements efficiently and securely.
                </p>
              </div>

              {/* Footer */}
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0, fontWeight: "600" }}>
                © 2026 Reimbursify. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Authenticated user - Redirect to trips dashboard which uses the global layout
  return null;
}
