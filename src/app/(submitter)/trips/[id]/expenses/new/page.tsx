"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { EXPENSE_TYPES } from "@/lib/expense-config";

interface Trip {
  id: string;
  title: string;
  expenses: any[];
}

export default function NewExpensePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const tripId = params?.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: "",
    category: "Travel",
    expenseType: "",
    paymentDate: new Date().toISOString().split("T")[0],
    currency: "INR",
    metadata: {} as Record<string, any>,
    files: [] as File[],
  });

  const categories = [
    { id: "Transport", label: "Transport" },
    { id: "Accommodation", label: "Accommodation" },
    { id: "Food", label: "Food & Meals" },
    { id: "Activities", label: "Activities" },
    { id: "Equipment", label: "Equipment" },
    { id: "Documents", label: "Documents & Permits" },
    { id: "Other", label: "Other" },
  ];

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.id || !tripId) return;

    const fetchTrip = async () => {
      try {
        const response = await fetch(`/api/trips/${tripId}`);
        if (!response.ok) throw new Error("Failed to fetch trip");
        const data = await response.json();
        setTrip(data.trip);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [session?.user?.id, tripId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.amount) {
      setError("Title and amount are required");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/trips/${tripId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          amount: parseFloat(formData.amount),
          category: formData.category,
          expenseType: formData.expenseType,
          paymentDate: formData.paymentDate,
          currency: formData.currency,
          metadata: JSON.stringify(formData.metadata),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create expense");
      }

      const data = await response.json();
      const expenseId = data.expense.id;

      // Upload files if any
      if (formData.files.length > 0) {
        for (const file of formData.files) {
          const fileFormData = new FormData();
          fileFormData.append("file", file);

          const uploadRes = await fetch(
            `/api/trips/${tripId}/expenses/${expenseId}/attachments`,
            {
              method: "POST",
              body: fileFormData,
            }
          );

          if (!uploadRes.ok) {
            console.error(`Failed to upload file: ${file.name}`);
          }
        }
      }

      router.push(`/trips/${tripId}/expenses/${expenseId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create expense");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>;
  }

  if (!session || !trip) {
    return null;
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Link
          href={`/trips/${tripId}`}
          style={{ color: "var(--primary)", textDecoration: "none", fontSize: "0.9rem", marginBottom: "1rem", display: "block" }}
        >
          ← Back to {trip.title}
        </Link>
        <h1 style={{ fontSize: "2rem", fontWeight: "bold", margin: "0.5rem 0" }}>Add New Expense</h1>
      </div>

      {error && (
        <div style={{ padding: "1rem", background: "#fee", border: "1px solid #fcc", borderRadius: "0.5rem", color: "#c33", marginBottom: "1rem" }}>
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
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Flight ticket, Hotel booking"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "0.4rem",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add any additional details..."
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
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid var(--border)",
                  borderRadius: "0.4rem",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
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
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                Payment Date
              </label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
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
            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.75rem" }}>
              Expense Type *
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: "0.5rem" }}>
              {Object.entries(EXPENSE_TYPES).map(([key, config]: any) => (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, expenseType: key })}
                  style={{
                    padding: "0.75rem",
                    border: formData.expenseType === key ? "2px solid #1b5e3f" : "2px solid #d1e8dd",
                    background: formData.expenseType === key ? "#f0f9f7" : "white",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.3rem",
                  }}
                >
                  <span style={{ fontSize: "1.5rem" }}>{config.icon}</span>
                  <span style={{ fontSize: "0.7rem", textAlign: "center" }}>{config.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Proof Fields Section */}
          {formData.expenseType && EXPENSE_TYPES[formData.expenseType as keyof typeof EXPENSE_TYPES]?.proofFields && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <label style={{ fontWeight: "600", color: "#1a3a2e" }}>Required Documents</label>
              {EXPENSE_TYPES[formData.expenseType as keyof typeof EXPENSE_TYPES].proofFields.map((field: any) => (
                <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.9rem", color: "#1a3a2e" }}>
                    {field.label} {field.required && <span style={{ color: "red" }}>*</span>}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      placeholder={field.label}
                      value={formData.metadata[field.key] || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        metadata: { ...formData.metadata, [field.key]: e.target.value }
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
                      value={formData.metadata[field.key] || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        metadata: { ...formData.metadata, [field.key]: e.target.value }
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

          {/* File Upload Section */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontWeight: "600", color: "#1a3a2e" }}>Attach Documents (Optional)</label>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.gif"
              onChange={(e) => {
                if (e.target.files) {
                  setFormData({
                    ...formData,
                    files: [...formData.files, ...Array.from(e.target.files)]
                  });
                  e.target.value = "";
                }
              }}
              style={{
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "0.4rem",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
            />
            
            {/* File Preview */}
            {formData.files.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.9rem", color: "#1a3a2e" }}>Attached Files ({formData.files.length})</label>
                {formData.files.map((file, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.5rem",
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border)",
                      borderRadius: "0.3rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    <span>{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        files: formData.files.filter((_, i) => i !== index)
                      })}
                      style={{
                        padding: "0.25rem 0.5rem",
                        background: "#e74c3c",
                        color: "white",
                        border: "none",
                        borderRadius: "0.25rem",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              type="submit"
              disabled={saving}
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
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Creating..." : "💳 Create Expense"}
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
    </main>
  );
}
