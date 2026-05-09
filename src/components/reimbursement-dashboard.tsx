"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { 
  initDB, 
  getLocalReimbursements, 
  createLocalReimbursement,
  updateLocalReimbursement,
  saveReimbursementsLocally 
} from "@/lib/db";
import { syncQueue, syncWithServer } from "@/lib/sync";

type Reimbursement = {
  id: string;
  title: string;
  amount: number;
  category: string;
  status: string;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  localOnly?: boolean;
  syncStatus?: "pending" | "synced" | "error";
};

function getBadgeStyles(status: string) {
  const s = status.toUpperCase();
  if (s === "DRAFT") return { backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)" };
  if (s === "SUBMITTED") return { backgroundColor: "rgba(59, 130, 246, 0.1)", color: "rgb(37, 99, 235)" };
  if (s === "APPROVED") return { backgroundColor: "rgba(34, 197, 94, 0.1)", color: "rgb(22, 163, 74)" };
  if (s === "REJECTED") return { backgroundColor: "rgba(239, 68, 68, 0.1)", color: "rgb(220, 38, 38)" };
  if (s === "PAID") return { backgroundColor: "rgba(16, 185, 129, 0.1)", color: "rgb(5, 150, 105)" };
  return { backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)" };
}

export function ReimbursementDashboard() {
  const { data: session } = useSession();
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: "Travel",
    receiptNotes: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  // Initialize IndexedDB and load local data
  useEffect(() => {
    if (session?.user) {
      loadLocalData();
      syncWithServer();
    }
  }, [session]);

  // Listen for online/offline events
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const unsubscribe = syncQueue.subscribe((online) => {
      setIsOnline(online);
      if (online) {
        setSyncMessage("Connected! Syncing data...");
        performSync();
      } else {
        setSyncMessage("Offline mode - changes will sync when online");
      }
    });

    return unsubscribe;
  }, []);

  const loadLocalData = async () => {
    setIsLoading(true);
    try {
      if (!session?.user?.id) return;
      const localItems = await getLocalReimbursements(session.user.id);
      setReimbursements(localItems);
    } catch (error) {
      console.error("Error loading local data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const performSync = async () => {
    setIsSyncing(true);
    setSyncMessage("Syncing...");
    try {
      const result = await syncWithServer();
      if (result.success) {
        setSyncMessage(`✓ Synced ${result.synced} items`);
        setTimeout(() => setSyncMessage(""), 3000);
        await loadLocalData();
      } else {
        setSyncMessage("Sync failed - will retry when online");
      }
    } catch (error) {
      console.error("Sync error:", error);
      setSyncMessage("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchReimbursements = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/reimbursements");
      if (res.ok) {
        const data = await res.json();
        const items = data.reimbursements || [];
        // Save server data to local storage
        await saveReimbursementsLocally(items);
        setReimbursements(items);
      }
    } catch (error) {
      console.error("Error fetching:", error);
      // Fall back to local data
      await loadLocalData();
    } finally {
      setIsLoading(false);
    }
  };

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim() || !form.amount.trim()) {
      alert("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isOnline) {
        // Try to create on server
        const res = await fetch("/api/reimbursements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            amount: parseFloat(form.amount),
            category: form.category,
            receiptNotes: form.receiptNotes,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          // Save to local storage
          await saveReimbursementsLocally([data.reimbursement]);
          setReimbursements((prev) => [data.reimbursement, ...prev]);
          setForm({ title: "", amount: "", category: "Travel", receiptNotes: "" });
          setSyncMessage("✓ Claim created");
          setTimeout(() => setSyncMessage(""), 3000);
        } else {
          // Save locally if server fails
          createDraftLocally();
        }
      } else {
        // Offline mode - save locally
        createDraftLocally();
      }
    } catch (error: any) {
      console.error("Error creating:", error);
      // On any error, save locally
      createDraftLocally();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createDraftLocally() {
    try {
      const newItem = await createLocalReimbursement({
        title: form.title,
        amount: parseFloat(form.amount),
        category: form.category,
        status: "DRAFT",
        userId: session?.user?.id || "",
        submittedAt: null,
        approvedAt: null,
        rejectedAt: null,
        paidAt: null,
      });

      setReimbursements((prev) => [newItem, ...prev]);
      setForm({ title: "", amount: "", category: "Travel", receiptNotes: "" });
      
      if (isOnline) {
        setSyncMessage("✓ Saved locally - will sync automatically");
      } else {
        setSyncMessage("✓ Saved offline - will sync when online");
      }
      setTimeout(() => setSyncMessage(""), 3000);
    } catch (error) {
      console.error("Error creating local draft:", error);
      alert("Failed to save claim");
    }
  }

  async function submitReimbursement(id: string) {
    try {
      if (isOnline) {
        const res = await fetch(`/api/reimbursements/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "SUBMITTED" }),
        });

        if (res.ok) {
          const data = await res.json();
          // Update local storage
          await updateLocalReimbursement(id, { status: "SUBMITTED" });
          setReimbursements((prev) =>
            prev.map((r) => (r.id === id ? data.reimbursement : r))
          );
          setSyncMessage("✓ Claim submitted");
          setTimeout(() => setSyncMessage(""), 3000);
        } else {
          alert("Failed to submit reimbursement");
        }
      } else {
        // Offline mode - update locally
        await updateLocalReimbursement(id, { 
          status: "SUBMITTED",
          syncStatus: "pending"
        });
        setReimbursements((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, status: "SUBMITTED", syncStatus: "pending" } : r
          )
        );
        setSyncMessage("✓ Marked for submission - will sync when online");
        setTimeout(() => setSyncMessage(""), 3000);
      }
    } catch (error) {
      console.error("Error submitting:", error);
      alert("Failed to submit reimbursement");
    }
  }

  const stats = {
    pending: reimbursements.filter((r) => r.status.toUpperCase() === "SUBMITTED").length,
    approved: reimbursements.filter((r) => r.status.toUpperCase() === "APPROVED").length,
    paid: reimbursements.filter((r) => r.status.toUpperCase() === "PAID").length,
    totalPaid: reimbursements
      .filter((r) => r.status.toUpperCase() === "PAID")
      .reduce((sum, r) => sum + r.amount, 0),
  };

  return (
    <div style={{ display: "grid", gap: "2rem", gridTemplateColumns: "minmax(0, 1fr)", maxWidth: "1200px" }}>
      {/* Status Bar */}
      {!isOnline && (
        <div style={{ 
          padding: "1rem", 
          background: "rgba(239, 68, 68, 0.1)", 
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "0.5rem",
          color: "rgb(220, 38, 38)",
          fontSize: "0.9rem",
          fontWeight: "500",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span>🔴 Offline Mode - Your data is saved locally</span>
          <button
            onClick={performSync}
            disabled={isSyncing}
            style={{
              padding: "0.25rem 0.75rem",
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgb(220, 38, 38)",
              color: "rgb(220, 38, 38)",
              borderRadius: "0.375rem",
              cursor: isSyncing ? "not-allowed" : "pointer",
              fontSize: "0.8rem",
              fontWeight: "500",
              opacity: isSyncing ? 0.6 : 1,
            }}
          >
            {isSyncing ? "Retrying..." : "Retry Sync"}
          </button>
        </div>
      )}

      {syncMessage && (
        <div style={{
          padding: "0.75rem 1rem",
          background: "rgba(34, 197, 94, 0.1)",
          border: "1px solid rgba(34, 197, 94, 0.3)",
          borderRadius: "0.5rem",
          color: "rgb(22, 163, 74)",
          fontSize: "0.85rem",
          fontWeight: "500"
        }}>
          {syncMessage}
        </div>
      )}
      {/* Stats Cards */}
      <section style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
        <div style={{ padding: "1.5rem", borderRadius: "0.75rem", background: "var(--bg-glass)", border: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Pending Approval</h3>
          <p style={{ fontSize: "1.8rem", fontWeight: "bold", color: "var(--accent-primary)" }}>{stats.pending}</p>
        </div>
        <div style={{ padding: "1.5rem", borderRadius: "0.75rem", background: "var(--bg-glass)", border: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Approved</h3>
          <p style={{ fontSize: "1.8rem", fontWeight: "bold", color: "var(--success)" }}>{stats.approved}</p>
        </div>
        <div style={{ padding: "1.5rem", borderRadius: "0.75rem", background: "var(--bg-glass)", border: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Paid Out</h3>
          <p style={{ fontSize: "1.8rem", fontWeight: "bold", color: "var(--success)" }}>${stats.totalPaid.toFixed(2)}</p>
        </div>
      </section>

      {/* Claims List */}
      <section>
        <h2 style={{ fontSize: "1.3rem", fontWeight: "bold", marginBottom: "1.5rem", color: "var(--text-primary)" }}>
          Your Claims
        </h2>
        {isLoading ? (
          <p style={{ color: "var(--text-muted)" }}>Loading...</p>
        ) : reimbursements.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", background: "var(--bg-secondary)", borderRadius: "0.75rem", border: "1px solid var(--border)" }}>
            <p style={{ color: "var(--text-muted)" }}>No reimbursement claims yet. Create one below.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {reimbursements.map((claim) => (
              <div
                key={claim.id}
                style={{
                  padding: "1.5rem",
                  background: claim.localOnly ? "var(--bg-secondary)" : "var(--bg-glass)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.75rem",
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto",
                  gap: "1.5rem",
                  alignItems: "center",
                  opacity: claim.syncStatus === "pending" ? 0.8 : 1,
                }}
              >
                <div>
                  <h3 style={{ fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                    {claim.title}
                    {claim.localOnly && (
                      <span style={{ 
                        marginLeft: "0.5rem",
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        fontWeight: "400"
                      }}>
                        (local)
                      </span>
                    )}
                  </h3>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
                    {claim.category} • {new Date(claim.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--text-primary)" }}>
                    ${claim.amount.toFixed(2)}
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.5rem", flexWrap: "wrap" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.25rem 0.75rem",
                        borderRadius: "0.375rem",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        ...getBadgeStyles(claim.status),
                      }}
                    >
                      {claim.status}
                    </span>
                    {claim.syncStatus === "pending" && (
                      <span style={{
                        display: "inline-block",
                        padding: "0.25rem 0.75rem",
                        borderRadius: "0.375rem",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        backgroundColor: "rgba(251, 191, 36, 0.1)",
                        color: "rgb(217, 119, 6)"
                      }}>
                        Pending Sync
                      </span>
                    )}
                  </div>
                </div>
                {claim.status === "DRAFT" && (
                  <button
                    onClick={() => submitReimbursement(claim.id)}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "var(--accent-primary)",
                      color: "var(--bg-primary)",
                      border: "none",
                      borderRadius: "0.5rem",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Submit
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Create Form */}
      <section style={{ background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1.5rem", color: "var(--text-primary)" }}>
          Create New Reimbursement
        </h2>
        <form style={{ display: "grid", gap: "1rem" }} onSubmit={handleSubmit}>
          <div>
            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-primary)" }}>
              Claim Title *
            </label>
            <input
              className="form-input"
              style={{ width: "100%" }}
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="e.g., Conference Travel"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                Amount *
              </label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                min="0"
                style={{ width: "100%" }}
                value={form.amount}
                onChange={(e) => updateField("amount", e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                Category
              </label>
              <select
                className="form-input"
                style={{ width: "100%" }}
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
              >
                <option>Travel</option>
                <option>Meals</option>
                <option>Supplies</option>
                <option>Tools</option>
                <option>Training</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-primary)" }}>
              Receipt Notes
            </label>
            <textarea
              className="form-input"
              style={{ width: "100%", minHeight: "100px" }}
              value={form.receiptNotes}
              onChange={(e) => updateField("receiptNotes", e.target.value)}
              placeholder="Add details about receipts or meeting details..."
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: "0.75rem 1.5rem",
              background: "var(--accent-primary)",
              color: "var(--bg-primary)",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "0.9rem",
              fontWeight: "600",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            {isSubmitting ? "Creating..." : "Save as Draft"}
          </button>
        </form>
      </section>
    </div>
  );
}
