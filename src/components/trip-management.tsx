"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Plus, ChevronDown, ChevronUp, Trash2, Edit2, MapPin, Calendar, DollarSign } from "lucide-react";

interface Trip {
  id: string;
  title: string;
  startDate: string;
  isCompleted: boolean;
  advanceDrawn: number;
  budgetHead?: string;
  purpose?: string;
  notes?: string;
  totalAmount?: number;
  expenseCount?: number;
  createdAt: string;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  expenseType: string;
  paymentDate: string;
  status: string;
}

export const TripManagement: React.FC<{
  onSelectTrip?: (tripId: string) => void;
  onCreateTrip?: (trip: Trip) => void;
}> = ({ onSelectTrip, onCreateTrip }) => {
  const { data: session } = useSession();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Record<string, Expense[]>>({});
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    startDate: "",
    purpose: "",
    budgetHead: "",
    notes: "",
  });

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const res = await fetch("/api/trips");
      if (res.ok) {
        const data = await res.json();
        setTrips(data.trips || []);
      }
    } catch (error) {
      console.error("Error fetching trips:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async (tripId: string) => {
    try {
      const res = await fetch(`/api/expenses?tripId=${tripId}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses((prev) => ({
          ...prev,
          [tripId]: data.expenses || [],
        }));
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
    }
  };

  const handleSelectTrip = (tripId: string) => {
    if (expandedTripId === tripId) {
      setExpandedTripId(null);
    } else {
      setExpandedTripId(tripId);
      if (!expenses[tripId]) {
        fetchExpenses(tripId);
      }
    }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        setTrips((prev) => [data.trip, ...prev]);
        setFormData({
          title: "",
          startDate: "",
          purpose: "",
          budgetHead: "",
          notes: "",
        });
        setShowCreateForm(false);
        if (onCreateTrip) onCreateTrip(data.trip);
      }
    } catch (error) {
      console.error("Error creating trip:", error);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!confirm("Are you sure you want to delete this trip?")) return;

    try {
      const res = await fetch(`/api/trips/${tripId}`, { method: "DELETE" });
      if (res.ok) {
        setTrips((prev) => prev.filter((t) => t.id !== tripId));
      }
    } catch (error) {
      console.error("Error deleting trip:", error);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)" }}>Loading trips...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "800", margin: 0 }}>My Trips</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.75rem 1.5rem",
            background: "var(--gradient-primary)",
            color: "white",
            border: "none",
            borderRadius: "0.75rem",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          <Plus size={20} />
          Create Trip
        </button>
      </div>

      {/* Create Trip Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateTrip}
          style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "0.75rem",
            padding: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                Trip Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Conference Visit - Delhi"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.5rem",
                  fontSize: "0.9rem",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.5rem",
                  fontSize: "0.9rem",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              Purpose
            </label>
            <textarea
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="Why are you taking this trip?"
              rows={2}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.5rem",
                fontSize: "0.9rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                Budget Head
              </label>
              <input
                type="text"
                value={formData.budgetHead}
                onChange={(e) => setFormData({ ...formData, budgetHead: e.target.value })}
                placeholder="e.g., CONF001"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.5rem",
                  fontSize: "0.9rem",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                Advance Drawn (₹)
              </label>
              <input
                type="number"
                value={formData.budgetHead}
                onChange={(e) => setFormData({ ...formData, budgetHead: e.target.value })}
                placeholder="0"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.5rem",
                  fontSize: "0.9rem",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              style={{
                padding: "0.75rem 1.5rem",
                background: "transparent",
                border: "1px solid #d1d5db",
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "0.75rem 1.5rem",
                background: "var(--gradient-primary)",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Create Trip
            </button>
          </div>
        </form>
      )}

      {/* Trips List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {trips.length === 0 ? (
          <div
            style={{
              background: "#f9fafb",
              border: "1px dashed #d1d5db",
              borderRadius: "0.75rem",
              padding: "3rem",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            <MapPin size={32} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
            <p>No trips yet. Create your first trip to get started!</p>
          </div>
        ) : (
          trips.map((trip) => (
            <div
              key={trip.id}
              style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "0.75rem",
                overflow: "hidden",
              }}
            >
              {/* Trip Header */}
              <div
                onClick={() => handleSelectTrip(trip.id)}
                style={{
                  padding: "1.5rem",
                  background: expandedTripId === trip.id ? "#f9fafb" : "white",
                  borderBottom: expandedTripId === trip.id ? "1px solid #e5e7eb" : "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  transition: "background 0.2s",
                }}
              >
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "700", margin: "0 0 0.5rem" }}>
                    {trip.title}
                  </h3>
                  <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                    {trip.startDate && (
                      <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <Calendar size={14} />
                        {new Date(trip.startDate).toLocaleDateString()}
                      </span>
                    )}
                    {trip.totalAmount && (
                      <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <DollarSign size={14} />₹{trip.totalAmount.toLocaleString()}
                      </span>
                    )}
                    {trip.expenseCount && (
                      <span>{trip.expenseCount} expenses</span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    color: trip.isCompleted ? "#10b981" : "#6b7280",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      padding: "0.25rem 0.75rem",
                      borderRadius: "0.25rem",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      background: trip.isCompleted ? "#dcfce7" : "#f3f4f6",
                      color: trip.isCompleted ? "#16a34a" : "#6b7280",
                    }}
                  >
                    {trip.isCompleted ? "Completed" : "In Progress"}
                  </span>
                  {expandedTripId === trip.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {/* Trip Details */}
              {expandedTripId === trip.id && (
                <div style={{ padding: "1.5rem", borderTop: "1px solid #e5e7eb", background: "#f9fafb" }}>
                  {trip.purpose && (
                    <div style={{ marginBottom: "1rem" }}>
                      <p style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-muted)", margin: 0 }}>
                        Purpose
                      </p>
                      <p style={{ margin: "0.25rem 0 0" }}>{trip.purpose}</p>
                    </div>
                  )}

                  {trip.notes && (
                    <div style={{ marginBottom: "1rem" }}>
                      <p style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-muted)", margin: 0 }}>
                        Notes
                      </p>
                      <p style={{ margin: "0.25rem 0 0" }}>{trip.notes}</p>
                    </div>
                  )}

                  {/* Expenses */}
                  {expenses[trip.id] && expenses[trip.id].length > 0 && (
                    <div style={{ marginTop: "1.5rem" }}>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "0.75rem" }}>Expenses</h4>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "0.875rem",
                        }}
                      >
                        <thead>
                          <tr style={{ borderBottom: "1px solid #d1d5db" }}>
                            <th style={{ padding: "0.5rem", textAlign: "left", fontWeight: "600" }}>Description</th>
                            <th style={{ padding: "0.5rem", textAlign: "right", fontWeight: "600" }}>Amount</th>
                            <th style={{ padding: "0.5rem", textAlign: "center", fontWeight: "600" }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenses[trip.id].map((exp) => (
                            <tr key={exp.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                              <td style={{ padding: "0.5rem" }}>{exp.title}</td>
                              <td style={{ padding: "0.5rem", textAlign: "right", fontWeight: "600" }}>
                                ₹{exp.amount?.toLocaleString()}
                              </td>
                              <td style={{ padding: "0.5rem", textAlign: "center" }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "0.25rem 0.5rem",
                                    borderRadius: "0.25rem",
                                    fontSize: "0.75rem",
                                    fontWeight: "600",
                                    background:
                                      exp.status === "APPROVED"
                                        ? "#dcfce7"
                                        : exp.status === "SUBMITTED"
                                        ? "#dbeafe"
                                        : "#fef3c7",
                                    color:
                                      exp.status === "APPROVED"
                                        ? "#16a34a"
                                        : exp.status === "SUBMITTED"
                                        ? "#0369a1"
                                        : "#92400e",
                                  }}
                                >
                                  {exp.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => onSelectTrip?.(trip.id)}
                      style={{
                        padding: "0.5rem 1rem",
                        background: "var(--gradient-primary)",
                        color: "white",
                        border: "none",
                        borderRadius: "0.5rem",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                      }}
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleDeleteTrip(trip.id)}
                      style={{
                        padding: "0.5rem 1rem",
                        background: "transparent",
                        color: "#dc2626",
                        border: "1px solid #fecaca",
                        borderRadius: "0.5rem",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
