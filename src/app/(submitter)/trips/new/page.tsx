"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewTripPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    startDate: new Date().toISOString().split("T")[0],
    budgetHead: "",
    purpose: "",
    notes: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError("Trip title is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          startDate: new Date(formData.startDate),
          budgetHead: formData.budgetHead || null,
          purpose: formData.purpose || null,
          notes: formData.notes || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create trip");
      }

      const data = await response.json();
      router.push(`/trips/${data.trip.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create trip");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Link
          href="/trips"
          style={{
            color: "var(--primary)",
            textDecoration: "none",
            fontSize: "0.9rem",
            marginBottom: "1rem",
            display: "block",
          }}
        >
          ← Back to Trips
        </Link>
        <h1 style={{ fontSize: "2rem", fontWeight: "bold", margin: "0.5rem 0" }}>
          Create New Trip
        </h1>
        <p style={{ color: "var(--text-muted)", margin: "0.5rem 0" }}>
          Start a new trip to track your expenses and manage reimbursements
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: "1rem",
            background: "#fee",
            border: "1px solid #fcc",
            borderRadius: "0.5rem",
            color: "#c33",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          padding: "2rem",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "0.75rem",
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              Trip Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Conference in Mumbai, Client Visit to Bangalore"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "0.4rem",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "1rem",
              }}
              required
            />
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.25rem 0 0 0" }}>
              Give your trip a descriptive name
            </p>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              Start Date
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "0.4rem",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "1rem",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                Budget Head
              </label>
              <input
                type="text"
                value={formData.budgetHead}
                onChange={(e) => setFormData({ ...formData, budgetHead: e.target.value })}
                placeholder="e.g., CC-001, R&D"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid var(--border)",
                  borderRadius: "0.4rem",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  fontSize: "1rem",
                }}
              />
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.25rem 0 0 0" }}>
                Cost center or department code
              </p>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                Purpose
              </label>
              <input
                type="text"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="e.g., Business trip, Training"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid var(--border)",
                  borderRadius: "0.4rem",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  fontSize: "1rem",
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              Additional Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional details about the trip..."
              rows={4}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "0.4rem",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontFamily: "inherit",
                fontSize: "1rem",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: "0.75rem 1.5rem",
                background: "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: "0.4rem",
                cursor: "pointer",
                fontWeight: "500",
                fontSize: "1rem",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "Creating..." : "✈️ Create Trip"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              style={{
                flex: 1,
                padding: "0.75rem 1.5rem",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                borderRadius: "0.4rem",
                cursor: "pointer",
                fontWeight: "500",
                fontSize: "1rem",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "0.5rem",
          fontSize: "0.9rem",
          color: "var(--text-muted)",
        }}
      >
        <strong>Tip:</strong> After creating your trip, you can add expenses, set advance amounts, and track your reimbursements.
      </div>
    </main>
  );
}
