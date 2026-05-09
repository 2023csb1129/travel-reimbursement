"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Header } from "@/components/header";

export default function ManagingExpensesDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        const session = await response.json();
        
        if (!session?.user?.id) {
          router.push("/auth/signin");
          return;
        }
        
        setUserName(session.user.name || session.user.email?.split("@")[0] || "User");
        setIsLoading(false);
      } catch (error) {
        console.error("Error checking session:", error);
        router.push("/auth/signin");
      }
    };

    checkSession();
  }, [router]);

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fafbfa" }}>
        <Header title="Managing Expenses" showAuthButtons={false} />
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ color: "var(--text-primary)", textAlign: "center" }}>
            <p style={{ fontSize: "1.1rem", fontWeight: "600" }}>Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fafbfa" }}>
      <Header title="Managing Expenses" showAuthButtons={true} />
      <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        {/* Main Content */}
      <div
        style={{
          display: "grid",
          gap: "2rem",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* Info Card */}
        <div
          style={{
            background: "linear-gradient(135deg, #e8f5f1 0%, #fef9e7 100%)",
            border: "2px solid #d1e8dd",
            borderRadius: "1rem",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>💰</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "800", margin: "0 0 0.5rem", color: "var(--text-primary)" }}>
            Expense Management Dashboard
          </h2>
          <p style={{ fontSize: "1rem", color: "var(--text-muted)", margin: "0.5rem 0 1.5rem", fontWeight: "600" }}>
            Track and organize all your reimbursable expenses efficiently
          </p>
          <button
            style={{
              padding: "0.75rem 2rem",
              fontSize: "0.95rem",
              fontWeight: "700",
              background: "var(--gradient-primary)",
              color: "white",
              border: "none",
              borderRadius: "0.75rem",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(109, 40, 217, 0.3)",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 25px rgba(109, 40, 217, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 15px rgba(109, 40, 217, 0.3)";
            }}
          >
            🚀 Coming Soon
          </button>
        </div>

        {/* Quick Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {[
            { icon: "📊", label: "Total Expenses", value: "₹0" },
            { icon: "✅", label: "Approved", value: "₹0" },
            { icon: "⏳", label: "Pending", value: "₹0" },
            { icon: "💳", label: "Active Trips", value: "0" },
          ].map((stat, idx) => (
            <div
              key={idx}
              style={{
                background: "white",
                border: "2px solid #e9d5ff",
                borderRadius: "0.75rem",
                padding: "1.5rem",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{stat.icon}</div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0, fontWeight: "600" }}>
                {stat.label}
              </p>
              <p style={{ fontSize: "1.5rem", fontWeight: "800", margin: "0.5rem 0 0", color: "var(--primary)" }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Note */}
      <div
        style={{
          marginTop: "3rem",
          padding: "1.5rem",
          background: "#fef9e7",
          border: "1px solid #fcd34d",
          borderRadius: "0.75rem",
          textAlign: "center",
          maxWidth: "1200px",
          margin: "auto",
        }}
      >
        <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: 0, fontWeight: "600" }}>
          💡 This dashboard is being customized for you. More features coming soon!
        </p>
      </div>
      </div>
    </div>
  );
}
