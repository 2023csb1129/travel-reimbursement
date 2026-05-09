"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  empCode?: string;
  designation?: string;
  department?: string;
  gradeLvl?: string;
}

interface PaymentCard {
  id: string;
  label: string;
  cardType: string;
  maskedNumber: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [paymentCards, setPaymentCards] = useState<PaymentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState({ label: "", type: "UPI", customType: "", details: "" });

  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    designation: "",
    department: "",
    empCode: "",
    gradeLvl: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/profile");
        if (!response.ok) throw new Error("Failed to fetch profile");

        const data = await response.json();
        setProfile(data.user);
        setFormData({
          name: data.user.name || "",
          designation: data.user.designation || "",
          department: data.user.department || "",
          empCode: data.user.empCode || "",
          gradeLvl: data.user.gradeLvl || "",
        });

        const cardsResponse = await fetch("/api/profile/payment-cards");
        if (cardsResponse.ok) {
          const cardsData = await cardsResponse.json();
          setPaymentCards(cardsData.cards || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [session?.user?.id]);

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save profile");
      }

      const data = await response.json();
      setProfile(data.user);
      setEditing(false);
      setSuccess("Profile updated successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCard = async () => {
    if (!newPaymentMethod.label) {
      setError("Please provide a label for the payment method.");
      return;
    }
    
    const finalType = newPaymentMethod.type === "Custom" ? newPaymentMethod.customType : newPaymentMethod.type;
    if (!finalType) {
      setError("Please provide a valid payment method type.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const response = await fetch("/api/profile/payment-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardLabel: newPaymentMethod.label,
          cardType: finalType,
          maskedNumber: newPaymentMethod.details || "N/A",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add payment method");
      }

      const data = await response.json();
      setPaymentCards([data.card, ...paymentCards]);
      setIsAddingCard(false);
      setNewPaymentMethod({ label: "", type: "UPI", customType: "", details: "" });
      setSuccess("Payment method added successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add payment method");
    } finally {
      setSaving(false);
    }
  };

  const handleForceSync = () => {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      const channel = new MessageChannel();
      navigator.serviceWorker.controller.postMessage({ type: "PRECACHE_ALL" }, [channel.port2]);
      navigator.serviceWorker.controller.postMessage({ type: "REFRESH_CACHE" }, [channel.port2]);
      alert("App data redownload triggered. The latest version of the app and your offline data will be available shortly.");
    } else {
      alert("Offline functionality is not supported or the app is still loading.");
    }
  };

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>;
  }

  if (!session || !profile) {
    return null;
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      {/* Headings removed per request */}

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

      {success && (
        <div
          style={{
            padding: "1rem",
            background: "#efe",
            border: "1px solid #cfc",
            borderRadius: "0.5rem",
            color: "#3c3",
            marginBottom: "1rem",
          }}
        >
          {success}
        </div>
      )}



      {/* Payment Cards Section */}
      <div
        style={{
          padding: "2rem",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "0.75rem",
          marginBottom: "2rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: "bold", margin: 0 }}>
            Payment Methods
          </h2>
          {!isAddingCard && (
            <button
              onClick={() => setIsAddingCard(true)}
              style={{
                padding: "0.5rem 1rem",
                background: "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: "0.4rem",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              ➕ Add Method
            </button>
          )}
        </div>

        {isAddingCard && (
          <div style={{ background: "white", padding: "1.5rem", borderRadius: "0.5rem", border: "1px solid var(--border)", marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1rem", marginTop: 0 }}>Add Payment Method</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>Label (e.g. My HDFC Card, My UPI)</label>
                <input
                  type="text"
                  value={newPaymentMethod.label}
                  onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, label: e.target.value })}
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.4rem", background: "var(--bg-primary)" }}
                  placeholder="e.g. Personal UPI"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>Method Type</label>
                <select
                  value={newPaymentMethod.type}
                  onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, type: e.target.value })}
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.4rem", background: "var(--bg-primary)" }}
                >
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Custom">Custom / Other</option>
                </select>
              </div>
            </div>
            {newPaymentMethod.type === "Custom" && (
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>Custom Method Name</label>
                <input
                  type="text"
                  value={newPaymentMethod.customType}
                  onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, customType: e.target.value })}
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.4rem", background: "var(--bg-primary)" }}
                  placeholder="e.g. Crypto Wallet"
                />
              </div>
            )}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>Details (Optional)</label>
              <input
                type="text"
                value={newPaymentMethod.details}
                onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, details: e.target.value })}
                style={{ width: "100%", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.4rem", background: "var(--bg-primary)" }}
                placeholder="e.g. ****1234 or yourname@upi"
              />
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={handleAddCard}
                disabled={saving}
                style={{ padding: "0.75rem 1.5rem", background: "var(--success)", color: "white", border: "none", borderRadius: "0.4rem", cursor: "pointer", fontWeight: "500", opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "Saving..." : "Save Method"}
              </button>
              <button
                onClick={() => setIsAddingCard(false)}
                disabled={saving}
                style={{ padding: "0.75rem 1.5rem", background: "transparent", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: "0.4rem", cursor: "pointer", fontWeight: "500" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {paymentCards.length === 0 ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              background: "var(--bg-primary)",
              borderRadius: "0.5rem",
              color: "var(--text-muted)",
            }}
          >
            <p>No payment methods saved yet</p>
            <button
              onClick={() => setIsAddingCard(true)}
              style={{
                marginTop: "1rem",
                padding: "0.5rem 1rem",
                background: "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: "0.4rem",
                cursor: "pointer",
              }}
            >
              ➕ Add Payment Method
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {paymentCards.map((card) => (
              <div
                key={card.id}
                style={{
                  padding: "1rem",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <p style={{ fontSize: "1rem", fontWeight: "500", color: "var(--text-primary)", margin: "0 0 0.25rem 0" }}>
                    {card.label}
                  </p>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: 0 }}>
                    {card.cardType} • {card.maskedNumber}
                  </p>
                </div>
                <button
                  onClick={() => {
                    // TODO: Add delete functionality
                    alert("Delete payment method feature coming soon");
                  }}
                  style={{
                    padding: "0.4rem 0.8rem",
                    background: "var(--danger)",
                    color: "white",
                    border: "none",
                    borderRadius: "0.3rem",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Offline Sync Section */}
      <div
        style={{
          padding: "2rem",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "0.75rem",
          marginBottom: "2rem",
        }}
      >
        <h2 style={{ fontSize: "1.3rem", fontWeight: "bold", margin: "0 0 0.5rem 0" }}>
          Offline Data & Sync
        </h2>
        <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", margin: "0 0 1.5rem 0", lineHeight: 1.5 }}>
          Reimbursify works offline, allowing you to view and manage trips and expenses without an internet connection. 
          Use this to forcefully re-download the latest app updates and refresh your offline data.
        </p>
        <button
          onClick={handleForceSync}
          style={{
            padding: "0.75rem 1.5rem",
            background: "var(--primary)",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontSize: "0.95rem",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span>🔄</span> Force Sync & Redownload Data
        </button>
      </div>
    </main>
  );
}
