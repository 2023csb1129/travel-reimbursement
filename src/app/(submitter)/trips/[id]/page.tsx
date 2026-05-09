"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Expense {
  id: string;
  title: string;
  description: string;
  amount: number;
  category: string;
  paymentDate: string;
  currency?: string;
  submittedById: string;
  tripId: string;
  bills?: any[];
}

interface Trip {
  id: string;
  title: string;
  startDate: string;
  userId: string;
  isCompleted: boolean;
  advanceDrawn: number;
  budgetHead: string;
  notes: string;
  isFavorite: boolean;
  isArchived: boolean;
  expenses: Expense[];
  _count?: { expenses: number };
}

export default function TripDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const tripId = params?.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);
  const [expenseSearch, setExpenseSearch] = useState("");
  const [editForm, setEditForm] = useState({
    title: "",
    budgetHead: "",
    notes: "",
    advanceDrawn: 0,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.id || !tripId) return;

    const fetchTrip = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/trips/${tripId}`);
        if (!response.ok) throw new Error("Failed to fetch trip");

        const data = await response.json();
        setTrip(data.trip);
        setEditForm({
          title: data.trip.title,
          budgetHead: data.trip.budgetHead || "",
          notes: data.trip.notes || "",
          advanceDrawn: data.trip.advanceDrawn || 0,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [session?.user?.id, tripId]);

  const handleSaveTrip = async () => {
    try {
      setSavingTrip(true);
      const response = await fetch(`/api/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) throw new Error("Failed to save trip");

      const data = await response.json();
      setTrip(data.trip);
      setEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save trip");
    } finally {
      setSavingTrip(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!trip) return;
    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !trip.isFavorite }),
      });
      if (response.ok) {
        const data = await response.json();
        setTrip(data.trip);
      }
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  const handleCompleteTrip = async () => {
    if (!trip) return;
    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !trip.isCompleted }),
      });
      if (response.ok) {
        const data = await response.json();
        setTrip(data.trip);
      }
    } catch (err) {
      console.error("Failed to update trip:", err);
    }
  };

  const handleDeleteExpense = async (e: React.MouseEvent, expenseId: string) => {
    e.preventDefault();
    if (!confirm("Are you sure you want to delete this expense? All receipts attached to it will also be lost.")) return;
    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setTrip((prev) => prev ? {
          ...prev,
          expenses: prev.expenses.filter((x) => x.id !== expenseId)
        } : null);
      } else {
        alert("Failed to delete expense.");
      }
    } catch (err) {
      console.error("Failed to delete expense:", err);
    }
  };

  if (status === "loading" || loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>;
  }

  if (!session || !trip) {
    return null;
  }

  const expenses = trip.expenses || [];
  const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netReimbursable = totalAmount - (trip.advanceDrawn || 0);

  const filteredExpenses = expenses.filter((e) => {
    if (!expenseSearch) return true;
    const term = expenseSearch.toLowerCase();
    return (
      e.title.toLowerCase().includes(term) ||
      e.category.toLowerCase().includes(term) ||
      (e.description && e.description.toLowerCase().includes(term))
    );
  });

  const currencySymbols: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };

  const getCurrencySymbol = (currency?: string) => currencySymbols[currency || "INR"] || currency || "₹";

  return (
    <main style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <Link
            href="/trips"
            style={{ color: "var(--primary)", textDecoration: "none", fontSize: "0.9rem", marginBottom: "1rem", display: "block" }}
          >
            ← Back to Trips
          </Link>
          <h1 style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--text-primary)", margin: "0.5rem 0" }}>
            {trip.title}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: "0" }}>
            {new Date(trip.startDate).toLocaleDateString()}
            {trip.isCompleted && (
              <span style={{ marginLeft: "1rem", padding: "0.25rem 0.75rem", background: "var(--success)", color: "white", borderRadius: "0.25rem", fontSize: "0.8rem" }}>
                Completed
              </span>
            )}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={handleToggleFavorite}
            style={{
              padding: "0.5rem 1rem",
              background: trip.isFavorite ? "var(--warning)" : "var(--bg-secondary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            {trip.isFavorite ? "⭐" : "☆"}
          </button>
          <button
            onClick={handleCompleteTrip}
            style={{
              padding: "0.5rem 1rem",
              background: trip.isCompleted ? "var(--success)" : "var(--bg-secondary)",
              color: trip.isCompleted ? "white" : "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              cursor: "pointer",
            }}
          >
            {trip.isCompleted ? "✓ Completed" : "Mark Complete"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "1rem", background: "#fee", border: "1px solid #fcc", borderRadius: "0.5rem", color: "#c33", marginBottom: "1rem" }}>
          Error: {error}
        </div>
      )}

      {/* Trip Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Total Expenses", value: `₹${totalAmount.toFixed(2)}` },
          { label: "Advance Drawn", value: `₹${trip.advanceDrawn.toFixed(2)}` },
          { label: "Net Reimbursable", value: `₹${Math.max(0, netReimbursable).toFixed(2)}` },
          { label: "Expense Count", value: expenses.length },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              padding: "1rem",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              textAlign: "center",
            }}
          >
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "0 0 0.5rem 0" }}>{item.label}</p>
            <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--text-primary)", margin: 0 }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Trip Details Edit */}
      <div style={{ marginBottom: "2rem", padding: "1.5rem", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", margin: 0 }}>Trip Details</h3>
          <button
            onClick={() => setEditing(!editing)}
            style={{
              padding: "0.5rem 1rem",
              background: editing ? "var(--danger)" : "var(--primary)",
              color: "white",
              border: "none",
              borderRadius: "0.4rem",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>

        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>Title</label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid var(--border)",
                  borderRadius: "0.4rem",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>Advance Drawn (₹)</label>
                <input
                  type="number"
                  value={editForm.advanceDrawn}
                  onChange={(e) => setEditForm({ ...editForm, advanceDrawn: parseFloat(e.target.value) })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid var(--border)",
                    borderRadius: "0.4rem",
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>Budget Head</label>
                <input
                  type="text"
                  value={editForm.budgetHead}
                  onChange={(e) => setEditForm({ ...editForm, budgetHead: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid var(--border)",
                    borderRadius: "0.4rem",
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>Notes</label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid var(--border)",
                  borderRadius: "0.4rem",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <button
              onClick={handleSaveTrip}
              disabled={savingTrip}
              style={{
                padding: "0.75rem 1.5rem",
                background: "var(--success)",
                color: "white",
                border: "none",
                borderRadius: "0.4rem",
                cursor: "pointer",
                fontWeight: "500",
                opacity: savingTrip ? 0.6 : 1,
              }}
            >
              {savingTrip ? "Saving..." : "Save Changes"}
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
            <div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0 0 0.25rem 0" }}>Budget Head</p>
              <p style={{ fontSize: "1rem", color: "var(--text-primary)", margin: 0, fontWeight: "500" }}>{trip.budgetHead || "—"}</p>
            </div>
            <div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0 0 0.25rem 0" }}>Notes</p>
              <p style={{ fontSize: "1rem", color: "var(--text-primary)", margin: 0, fontWeight: "500" }}>{trip.notes || "—"}</p>
            </div>
          </div>
        )}
      </div>

      {/* Expenses Section */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Expenses</h2>
          <Link
            href={`/trips/${tripId}/expenses/new`}
            style={{
              padding: "0.75rem 1.5rem",
              background: "var(--primary)",
              color: "white",
              textDecoration: "none",
              borderRadius: "0.5rem",
              fontWeight: "500",
            }}
          >
            ➕ Add Expense
          </Link>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <input
            type="text"
            placeholder="Search expenses..."
            value={expenseSearch}
            onChange={(e) => setExpenseSearch(e.target.value)}
            style={{
              width: "100%",
              maxWidth: "300px",
              padding: "0.5rem 1rem",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {filteredExpenses.length === 0 ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              color: "var(--text-muted)",
            }}
          >
            <p style={{ margin: 0 }}>No expenses found.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                style={{
                  padding: "1rem",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: "background 0.2s",
                }}
              >
                <Link
                  href={`/trips/${tripId}/expenses/${expense.id}`}
                  style={{ textDecoration: "none", flex: 1, display: "block" }}
                >
                  <div>
                    <p style={{ fontSize: "1rem", fontWeight: "500", color: "var(--text-primary)", margin: "0 0 0.25rem 0", textDecoration: "underline", textDecorationColor: "transparent", transition: "text-decoration-color 0.2s" }}
                       onMouseEnter={(e) => (e.currentTarget.style.textDecorationColor = "var(--primary)")}
                       onMouseLeave={(e) => (e.currentTarget.style.textDecorationColor = "transparent")}
                    >
                      {expense.title}
                    </p>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                      {expense.category} • {new Date(expense.paymentDate).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                  <p style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--primary)", margin: 0 }}>
                    {getCurrencySymbol(expense.currency)}{expense.amount?.toFixed(2) || "0.00"}
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={(e) => { e.preventDefault(); router.push(`/trips/${tripId}/expenses/${expense.id}`); }}
                      style={{
                        padding: "0.4rem 0.6rem",
                        background: "#e0f2fe",
                        color: "#0284c7",
                        border: "1px solid #bae6fd",
                        borderRadius: "0.3rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        fontSize: "0.9rem"
                      }}
                      title="Edit Expense"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={(e) => handleDeleteExpense(e, expense.id)}
                      style={{
                        padding: "0.4rem 0.6rem",
                        background: "#fee2e2",
                        color: "#dc2626",
                        border: "1px solid #fecaca",
                        borderRadius: "0.3rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        fontSize: "0.9rem"
                      }}
                      title="Delete Expense"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
