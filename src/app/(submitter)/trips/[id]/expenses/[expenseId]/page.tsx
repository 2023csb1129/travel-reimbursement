"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { EXPENSE_TYPES } from "@/lib/expense-config";

interface Expense {
  id: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  expenseType: string;
  paymentDate: string;
  metadata?: string | null;
  bills?: any[];
  submittedById: string;
  tripId: string;
}

export default function ExpenseDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const tripId = params?.id as string;
  const expenseId = params?.expenseId as string;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    amount: "",
    currency: "INR",
    category: "",
    expenseType: "",
    paymentDate: "",
    metadata: {} as Record<string, any>,
  });

  const categories = [
    { id: "transport", label: "Transport" },
    { id: "accommodation", label: "Accommodation" },
    { id: "food", label: "Food & Meals" },
    { id: "activities", label: "Activities" },
    { id: "equipment", label: "Equipment" },
    { id: "documents", label: "Documents" },
    { id: "other", label: "Other" },
  ];

  const currencySymbols: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.id || !tripId || !expenseId) return;

    const fetchExpense = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/trips/${tripId}/expenses/${expenseId}`);
        if (!response.ok) throw new Error("Failed to fetch expense");

        const data = await response.json();
        setExpense(data.expense);
        setEditForm({
          title: data.expense.title,
          description: data.expense.description || "",
          amount: data.expense.amount.toString(),
          currency: data.expense.currency || "INR",
          category: data.expense.category,
          expenseType: data.expense.expenseType || "",
          paymentDate: data.expense.paymentDate,
          metadata: data.expense.metadata ? JSON.parse(data.expense.metadata) : {},
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchExpense();
  }, [session?.user?.id, tripId, expenseId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/trips/${tripId}/expenses/${expenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          amount: parseFloat(editForm.amount),
          metadata: JSON.stringify(editForm.metadata),
        }),
      });

      if (!response.ok) throw new Error("Failed to save expense");

      const data = await response.json();
      setExpense(data.expense);
      setEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      const response = await fetch(`/api/trips/${tripId}/expenses/${expenseId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete expense");

      router.push(`/trips/${tripId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete expense");
    }
  };

  if (status === "loading" || loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>;
  }

  if (!session || !expense) {
    return null;
  }

  const categoryLabel = categories.find((c) => c.id === expense.category)?.label || expense.category;
  const currencySymbol = currencySymbols[expense.currency] || expense.currency;

  return (
    <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Link
          href={`/trips/${tripId}`}
          style={{ color: "var(--primary)", textDecoration: "none", fontSize: "0.9rem", marginBottom: "1rem", display: "block" }}
        >
          ← Back to Trip
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: "bold", margin: 0 }}>{expense.title}</h1>
          <div style={{ display: "flex", gap: "0.5rem" }}>
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
            {!editing && (
              <button
                onClick={handleDelete}
                style={{
                  padding: "0.5rem 1rem",
                  background: "var(--danger)",
                  color: "white",
                  border: "none",
                  borderRadius: "0.4rem",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: "1rem", background: "#fee", border: "1px solid #fcc", borderRadius: "0.5rem", color: "#c33", marginBottom: "1rem" }}>
          Error: {error}
        </div>
      )}

      {editing ? (
        <div
          style={{
            padding: "2rem",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "0.75rem",
          }}
        >
          <form style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
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

            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
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
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>Currency</label>
                <select
                  value={editForm.currency}
                  onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid var(--border)",
                    borderRadius: "0.4rem",
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option>INR</option>
                  <option>USD</option>
                  <option>EUR</option>
                  <option>GBP</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>Category</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid var(--border)",
                    borderRadius: "0.4rem",
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                  }}
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>Payment Date</label>
                <input
                  type="date"
                  value={editForm.paymentDate}
                  onChange={(e) => setEditForm({ ...editForm, paymentDate: e.target.value })}
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

            {/* Proof Fields Section in Edit Mode */}
            {editForm.expenseType && EXPENSE_TYPES[editForm.expenseType as keyof typeof EXPENSE_TYPES]?.proofFields && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontWeight: "600", color: "var(--text-primary)" }}>Proof Documents</label>
                {EXPENSE_TYPES[editForm.expenseType as keyof typeof EXPENSE_TYPES].proofFields.map((field: any) => (
                  <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <label style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>
                      {field.label}
                    </label>
                    {field.type === "textarea" ? (
                      <textarea
                        placeholder={field.label}
                        value={editForm.metadata[field.key] || ""}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          metadata: { ...editForm.metadata, [field.key]: e.target.value }
                        })}
                        style={{
                          padding: "0.75rem",
                          border: "1px solid var(--border)",
                          borderRadius: "0.4rem",
                          background: "var(--bg-primary)",
                          color: "var(--text-primary)",
                          fontFamily: "inherit",
                          minHeight: "60px",
                        }}
                      />
                    ) : (
                      <input
                        type={field.type}
                        placeholder={field.label}
                        value={editForm.metadata[field.key] || ""}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          metadata: { ...editForm.metadata, [field.key]: e.target.value }
                        })}
                        style={{
                          padding: "0.75rem",
                          border: "1px solid var(--border)",
                          borderRadius: "0.4rem",
                          background: "var(--bg-primary)",
                          color: "var(--text-primary)",
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "0.75rem 1.5rem",
                  background: "var(--success)",
                  color: "white",
                  border: "none",
                  borderRadius: "0.4rem",
                  cursor: "pointer",
                  fontWeight: "500",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div
          style={{
            padding: "2rem",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "0.75rem",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "2rem" }}>
            <div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0 0 0.5rem 0" }}>Amount</p>
              <p style={{ fontSize: "1.8rem", fontWeight: "bold", color: "var(--primary)", margin: 0 }}>
                {currencySymbol}{expense.amount?.toFixed(2) || "0.00"}
              </p>
            </div>

            <div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0 0 0.5rem 0" }}>Currency</p>
              <p style={{ fontSize: "1rem", fontWeight: "500", color: "var(--text-primary)", margin: 0 }}>
                {expense.currency || "INR"}
              </p>
            </div>

            <div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0 0 0.5rem 0" }}>Category</p>
              <p style={{ fontSize: "1rem", fontWeight: "500", color: "var(--text-primary)", margin: 0 }}>
                {categoryLabel}
              </p>
            </div>

            <div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0 0 0.5rem 0" }}>Payment Date</p>
              <p style={{ fontSize: "1rem", color: "var(--text-primary)", margin: 0 }}>
                {new Date(expense.paymentDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          {expense.description && (
            <div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0 0 0.5rem 0" }}>Description</p>
              <p style={{ fontSize: "1rem", color: "var(--text-primary)", margin: 0 }}>{expense.description}</p>
            </div>
          )}

          {/* Proof Fields Display */}
          {expense.expenseType && EXPENSE_TYPES[expense.expenseType as keyof typeof EXPENSE_TYPES]?.proofFields && (
            <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
              <p style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 1rem 0" }}>Proof Documents</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
                {EXPENSE_TYPES[expense.expenseType as keyof typeof EXPENSE_TYPES].proofFields.map((field: any) => {
                  const metadata = expense.metadata ? JSON.parse(expense.metadata) : {};
                  const value = metadata[field.key];
                  return (
                    <div key={field.key}>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0 0 0.5rem 0" }}>{field.label}</p>
                      <p style={{ fontSize: "1rem", color: "var(--text-primary)", margin: 0, wordBreak: "break-word" }}>
                        {value || "—"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Attached Files Section */}
          {expense.bills && expense.bills.length > 0 && (
            <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
              <p style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 1rem 0" }}>
                Attached Documents ({expense.bills.length})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {expense.bills.map((file: any) => (
                  <div
                    key={file.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.75rem",
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border)",
                      borderRadius: "0.3rem",
                    }}
                  >
                    <div>
                      <p style={{ fontSize: "0.95rem", fontWeight: "500", color: "var(--text-primary)", margin: 0 }}>
                        {file.fileName}
                      </p>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0.25rem 0 0 0" }}>
                        {(file.fileSize / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <a
                      href={`/api/trips/${tripId}/expenses/${expenseId}/attachments?fileId=${file.id}`}
                      download
                      style={{
                        padding: "0.5rem 1rem",
                        background: "var(--primary)",
                        color: "white",
                        border: "none",
                        borderRadius: "0.3rem",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        textDecoration: "none",
                      }}
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
