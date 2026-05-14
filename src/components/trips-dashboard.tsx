"use client";

import { forwardRef, useEffect, useState, useImperativeHandle } from "react";
import { useSession } from "next-auth/react";
import { EXPENSE_TYPES } from "@/lib/expense-config";
import { CURRENCIES, getCurrencyDisplay } from "@/lib/currencies";
import {
  cacheTrips,
  cacheSingleTrip,
  getCachedTrips,
  cacheExpenses,
  getCachedExpensesByTrip,
  cacheSingleExpense,
} from "@/lib/offline-db";
import { Plus, ArrowRight, Plane, Calendar, CreditCard, PieChart, Star, Archive, Trash2, ChevronRight, Eye } from "lucide-react";

interface Trip {
  id: string;
  title: string;
  startDate: string;
  isCompleted: boolean;
  advanceDrawn: number;
  budgetHead?: string;
  purpose?: string;
  notes?: string;
  createdAt: string;
  totalAmount?: number;
  expenseCount?: number;
  isFavorite?: boolean;
  isArchived?: boolean;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  expenseType: string;
  paymentDate: string;
  status: string;
  tripId: string;
}

export const TripsDashboard = forwardRef((_, ref) => {
  const { data: session } = useSession();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewTripForm, setShowNewTripForm] = useState(false);
  const [showAddExpenseForm, setShowAddExpenseForm] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [sidebarView, setSidebarView] = useState<"trips" | "add-trip" | "add-expense" | "edit-expense" | "trip-detail">("trips");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);
  const [filterView, setFilterView] = useState<"active" | "favorites" | "archived">("active");

  const [tripDetails, setTripDetails] = useState<Trip | null>(null);
  const [tripExpenses, setTripExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [paymentCards, setPaymentCards] = useState<any[]>([]);

  const [tripForm, setTripForm] = useState({
    title: "",
    startDate: "",
    purpose: "",
    budgetHead: "",
    notes: "",
  });

  // Set today's date as default
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [expenseForm, setExpenseForm] = useState({
    title: "",
    amount: "",
    category: "Travel",
    expenseType: "",
    paymentDate: getTodayDate(),
    paymentMethod: "Cash",
    description: "",
    currency: "INR",
    metadata: {} as Record<string, any>,
    files: [] as File[],
    existingBills: [] as any[],
  });

  useImperativeHandle(ref, () => ({
    openAddTripForm: () => {
      setSidebarView("add-trip");
      setShowNewTripForm(true);
    },
    openAddExpenseForm: () => {
      setSelectedTripId(null);
      setSidebarView("add-expense");
      setShowAddExpenseForm(true);
    },
  }));

  useEffect(() => {
    if (session?.user?.id) {
      fetchTrips();
      fetch("/api/profile/payment-cards")
        .then(res => res.json())
        .then(data => {
          if (data.cards) setPaymentCards(data.cards);
        })
        .catch(console.error);
    }
  }, [session?.user?.id]);

  const fetchTrips = async () => {
    setLoading(true);

    // ── Serve cached data immediately (offline-first) ──────────────────────
    try {
      const cached = await getCachedTrips();
      if (cached.length > 0) {
        setTrips(cached);
        setLoading(false); // show cached data right away
      }
    } catch (_) {}

    // ── Then hit the network and update both UI + cache ────────────────────
    try {
      const allRes = await fetch("/api/trips?archived=true");
      if (allRes.ok) {
        const allData = await allRes.json();
        const fresh = allData.trips || [];
        setTrips(fresh);
        await cacheTrips(fresh).catch(() => {});
      }
    } catch (error) {
      console.error("Error fetching trips (using cache):", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent, trip: Trip) => {
    e.stopPropagation();
    try {
      setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, isFavorite: !t.isFavorite } : t));
      await fetch(`/api/trips/${trip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !trip.isFavorite })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const toggleArchive = async (e: React.MouseEvent, trip: Trip) => {
    e.stopPropagation();
    try {
      setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, isArchived: !t.isArchived } : t));
      await fetch(`/api/trips/${trip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !trip.isArchived })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTrip = async (e: React.MouseEvent, trip: Trip) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${trip.title}"? This will delete all associated expenses and cannot be undone.`)) return;
    try {
      setTrips(prev => prev.filter(t => t.id !== trip.id));
      await fetch(`/api/trips/${trip.id}`, { method: "DELETE" });
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTripExpenses = async (tripId: string) => {
    setLoadingExpenses(true);

    // ── Serve cached expenses immediately ─────────────────────────────────
    try {
      const cached = await getCachedExpensesByTrip(tripId);
      if (cached.length > 0) {
        setTripExpenses(cached as Expense[]);
        setLoadingExpenses(false);
      }
    } catch (_) {}

    // ── Then refresh from network ──────────────────────────────────────────
    try {
      const res = await fetch(`/api/trips/${tripId}/expenses`);
      if (res.ok) {
        const data = await res.json();
        const fresh = (data.expenses || []).map((e: any) => ({ ...e, tripId }));
        setTripExpenses(fresh);
        await cacheExpenses(fresh).catch(() => {});
      }
    } catch (error) {
      console.error("Error fetching expenses (using cache):", error);
    } finally {
      setLoadingExpenses(false);
    }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripForm.title || !tripForm.startDate) {
      alert("Please fill in required fields");
      return;
    }

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: tripForm.title,
          startDate: tripForm.startDate,
          purpose: tripForm.purpose || null,
          budgetHead: tripForm.budgetHead || null,
          notes: tripForm.notes || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newTrip = data.trip;
        setTrips([newTrip, ...trips]);
        // Cache the new trip locally
        cacheSingleTrip(newTrip).catch(() => {});
        setTripForm({ title: "", startDate: "", purpose: "", budgetHead: "", notes: "" });
        setShowNewTripForm(false);
        setSidebarView("trips");
      } else if (res.status === 202) {
        // Queued offline — add optimistic entry
        const tempTrip: Trip = {
          id: `local-${Date.now()}`,
          title: tripForm.title,
          startDate: tripForm.startDate,
          isCompleted: false,
          advanceDrawn: 0,
          purpose: tripForm.purpose,
          budgetHead: tripForm.budgetHead,
          notes: tripForm.notes,
          createdAt: new Date().toISOString(),
        };
        setTrips([tempTrip, ...trips]);
        cacheSingleTrip(tempTrip).catch(() => {});
        setTripForm({ title: "", startDate: "", purpose: "", budgetHead: "", notes: "" });
        setShowNewTripForm(false);
        setSidebarView("trips");
        alert("Trip saved offline — will sync when back online.");
      } else {
        alert("Failed to create trip");
      }
    } catch (error) {
      console.error("Error creating trip:", error);
      alert("Error creating trip");
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId || !expenseForm.title || !expenseForm.amount) {
      alert("Please fill in all required fields: Trip, Title, and Amount");
      return;
    }

    if (!expenseForm.paymentDate) {
      alert("Please select a payment date");
      return;
    }

    if (!expenseForm.category || !["Travel", "Accommodation", "Other", "Personal"].includes(expenseForm.category)) {
      alert("Please select a valid category");
      return;
    }

    try {
      const isEdit = sidebarView === "edit-expense" && editingExpenseId;
      const res = await fetch(isEdit ? `/api/expenses/${editingExpenseId}` : "/api/expenses", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: selectedTripId,
          title: expenseForm.title,
          amount: parseFloat(expenseForm.amount),
          category: expenseForm.category,
          expenseType: expenseForm.expenseType,
          date: expenseForm.paymentDate,
          paymentMethod: expenseForm.paymentMethod,
          description: expenseForm.description || null,
          currency: expenseForm.currency || "INR",
          metadata: expenseForm.metadata,
        }),
      });

      if (res.ok) {
        const expenseData = await res.json();
        const expenseId = expenseData.expense?.id;

        // Cache the expense locally right away
        if (expenseData.expense) {
          cacheSingleExpense({ ...expenseData.expense, tripId: selectedTripId }).catch(() => {});
        }

        // Upload files if any
        if (expenseForm.files.length > 0 && expenseId) {
          for (const file of expenseForm.files) {
            const formData = new FormData();
            formData.append("file", file);
            await fetch(
              `/api/trips/${selectedTripId}/expenses/${expenseId}/attachments`,
              { method: "POST", body: formData }
            );
          }
        }

        setExpenseForm({ title: "", amount: "", category: "Travel", expenseType: "", paymentDate: getTodayDate(), paymentMethod: "Cash", description: "", currency: "INR", metadata: {}, files: [], existingBills: [] });
        setEditingExpenseId(null);
        setShowAddExpenseForm(false);
        setSidebarView("trip-detail");
        if (selectedTripId) fetchTripExpenses(selectedTripId);
        fetchTrips();
      } else if (res.status === 202) {
        // Queued offline — add optimistic entry
        const tempExpense: Expense = {
          id: `local-${Date.now()}`,
          title: expenseForm.title,
          amount: parseFloat(expenseForm.amount),
          category: expenseForm.category,
          expenseType: expenseForm.expenseType,
          paymentDate: expenseForm.paymentDate,
          status: "PENDING",
          tripId: selectedTripId!,
        };
        setTripExpenses(prev => [...prev, tempExpense]);
        cacheSingleExpense(tempExpense).catch(() => {});
        setExpenseForm({ title: "", amount: "", category: "Travel", expenseType: "", paymentDate: getTodayDate(), paymentMethod: "Cash", description: "", currency: "INR", metadata: {}, files: [], existingBills: [] });
        setSidebarView("trip-detail");
        alert("Expense saved offline — will sync when back online.");
      } else {
        const errorData = await res.json().catch(() => ({error: "Failed to save expense"}));
        alert(`Failed to save expense: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error saving expense:", error);
      alert("Error saving expense");
    }
  };

  const startEditExpense = (expense: any) => {
    setSelectedTripId(expense.tripId);
    setExpenseForm({
      title: expense.title,
      amount: expense.amount.toString(),
      category: expense.category,
      expenseType: expense.expenseType,
      paymentDate: new Date(expense.paymentDate).toISOString().split("T")[0],
      paymentMethod: expense.paymentMethod || "Cash",
      description: expense.description || "",
      currency: expense.currency || "INR",
      metadata: (() => {
        try {
          let parsed = typeof expense.metadata === "string" ? JSON.parse(expense.metadata) : (expense.metadata || {});
          if (typeof parsed === "string") parsed = JSON.parse(parsed);
          return typeof parsed === "object" && parsed !== null ? parsed : {};
        } catch { return {}; }
      })(),
      files: [],
      existingBills: expense.bills || [],
    });
    setEditingExpenseId(expense.id);
    setSidebarView("edit-expense");
  };

  const handleDeleteExistingBill = async (billId: string) => {
    if (!confirm("Are you sure you want to delete this attachment?")) return;
    try {
      const res = await fetch(`/api/files/${billId}`, { method: "DELETE" });
      if (res.ok) {
        setExpenseForm(prev => ({
          ...prev,
          existingBills: prev.existingBills.filter(b => b.id !== billId)
        }));
        // Update the cached/state expense
        setTripExpenses(prev => prev.map(exp => {
          if (exp.id === editingExpenseId) {
            return { ...exp, bills: exp.bills?.filter((b: any) => b.id !== billId) };
          }
          return exp;
        }));
      } else {
        alert("Failed to delete attachment");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting attachment");
    }
  };

  const handleDeleteExpense = async (e: React.MouseEvent, expenseId: string) => {
    e.stopPropagation();
    if (!confirm("Delete this expense? Receipts will also be lost.")) return;
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, { method: "DELETE" });
      if (res.ok) {
        setTripExpenses((prev) => prev.filter((exp) => exp.id !== expenseId));
        fetchTrips(); // update global amounts
      } else {
        alert("Failed to delete expense");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting expense");
    }
  };

  // Filter expense types based on selected category
  const getFilteredExpenseTypes = () => {
    return Object.entries(EXPENSE_TYPES).filter(([_, config]: any) => config.category === expenseForm.category);
  };

  return (
    <div style={{ display: "flex", height: "100%", width: "100%", background: "#ffffff", borderRadius: "0.5rem", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", paddingTop: "0.5rem", boxSizing: "border-box" }}>
      {/* Left Sidebar (Now Full View Container) */}
      <div
        style={{
          display: sidebarView === "trips" ? "none" : "flex",
          width: "100%",
          maxWidth: "800px",
          margin: "0 auto",
          borderRight: "none",
          background: "#ffffff",
          flexDirection: "column",
        }}
      >
        {/* Sidebar Header */}
        <div
          style={{
            padding: "1.5rem",
            borderBottom: "1px solid #e5e7eb",
            background: "#ffffff",
          }}
        >
          <h2 style={{ margin: 0, color: "#1a3a2e", fontSize: "1.25rem", fontWeight: "700" }}>
            {sidebarView === "add-trip" ? "New Trip" : sidebarView === "add-expense" ? "Add Expense" : sidebarView === "trip-detail" ? "Trip Summary" : "Trips & Expenses"}
          </h2>
        </div>

        {/* Sidebar Content - Scrollable */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {/* Add Trip Form View */}
          {sidebarView === "add-trip" && (
            <form onSubmit={handleCreateTrip} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem", color: "#1a3a2e" }}>
                  Trip Title *
                </label>
                <input
                  type="text"
                  placeholder="Enter trip name"
                  value={tripForm.title}
                  onChange={(e) => setTripForm({ ...tripForm, title: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    fontSize: "0.95rem",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem", color: "#1a3a2e" }}>
                  Start Date *
                </label>
                <input
                  type="date"
                  value={tripForm.startDate}
                  onChange={(e) => setTripForm({ ...tripForm, startDate: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    fontSize: "0.95rem",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem", color: "#1a3a2e" }}>
                  Purpose
                </label>
                <input
                  type="text"
                  placeholder="Trip purpose"
                  value={tripForm.purpose}
                  onChange={(e) => setTripForm({ ...tripForm, purpose: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    fontSize: "0.95rem",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem", color: "#1a3a2e" }}>
                  Budget Head
                </label>
                <input
                  type="text"
                  placeholder="Budget category"
                  value={tripForm.budgetHead}
                  onChange={(e) => setTripForm({ ...tripForm, budgetHead: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    fontSize: "0.95rem",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem", color: "#1a3a2e" }}>
                  Notes
                </label>
                <textarea
                  placeholder="Any additional notes"
                  value={tripForm.notes}
                  onChange={(e) => setTripForm({ ...tripForm, notes: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    fontSize: "0.95rem",
                    fontFamily: "inherit",
                    minHeight: "80px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    background: "#1b5e3f",
                    color: "white",
                    border: "none",
                    borderRadius: "0.5rem",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSidebarView("trips");
                    setShowNewTripForm(false);
                  }}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    background: "white",
                    color: "#1b5e3f",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Add Expense Form View */}
          {(sidebarView === "add-expense" || sidebarView === "edit-expense") && (
            <form onSubmit={handleAddExpense} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {selectedTripId === null ? (
                <div>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem", color: "#1a3a2e" }}>
                    Select Trip *
                  </label>
                  <select
                    value={selectedTripId || ""}
                    onChange={(e) => setSelectedTripId(e.target.value || null)}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.5rem",
                      fontSize: "0.95rem",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                      cursor: "pointer",
                      backgroundColor: "#f3f4f6",
                      color: "#1a3a2e",
                    }}
                  >
                    <option value="">Choose a trip...</option>
                    {trips.map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {trip.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem", color: "#1a3a2e" }}>
                  Expense Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Flight ticket"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    fontSize: "0.95rem",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem", color: "#1a3a2e" }}>
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.5rem",
                      fontSize: "0.95rem",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem", color: "#1a3a2e" }}>
                    Currency
                  </label>
                  <select
                    value={expenseForm.currency}
                    onChange={(e) => setExpenseForm({ ...expenseForm, currency: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.5rem",
                      fontSize: "0.95rem",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                      cursor: "pointer",
                      backgroundColor: "#f3f4f6",
                      color: "#1a3a2e",
                    }}
                  >
                    <option value="">Select Currency...</option>
                    {CURRENCIES.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.flag} {currency.code} - {currency.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem", color: "#1a3a2e" }}>
                  Category *
                </label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => {
                    setExpenseForm({ ...expenseForm, category: e.target.value, expenseType: "" });
                  }}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    fontSize: "0.95rem",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    cursor: "pointer",
                    backgroundColor: "#f3f4f6",
                    color: "#1a3a2e",
                  }}
                >
                  <option value="Travel">🚆 Travel (Air/Train/Bus/Taxi)</option>
                  <option value="Accommodation">🏨 Accommodation (Hotel/Guest House)</option>
                  <option value="Other">📋 Other (Registration/Visa/Charges)</option>
                  <option value="Personal">👤 Personal</option>
                </select>
              </div>

              {/* Expense Type List - Show filtered types for selected category */}
              {getFilteredExpenseTypes().length > 0 && (
                <div>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.75rem", color: "#1a3a2e" }}>
                    Expense Type *
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {getFilteredExpenseTypes().map(([key, config]: any) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setExpenseForm({ ...expenseForm, expenseType: key, metadata: {} })}
                        style={{
                          padding: "0.75rem",
                          border: expenseForm.expenseType === key ? "2px solid #1b5e3f" : "1px solid #e5e7eb",
                          background: expenseForm.expenseType === key ? "#f0f9f7" : "white",
                          borderRadius: "0.5rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          textAlign: "left",
                          fontSize: "0.95rem",
                          fontWeight: expenseForm.expenseType === key ? "600" : "500",
                          color: "#1a3a2e",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (expenseForm.expenseType !== key) {
                            e.currentTarget.style.background = "#f9fafb";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (expenseForm.expenseType !== key) {
                            e.currentTarget.style.background = "white";
                          }
                        }}
                      >
                        <span style={{ fontSize: "1.5rem" }}>{config.outlineIcon || config.icon}</span>
                        <span>{config.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: expenseForm.paymentMethod === "Saved Payment Methods" ? "1fr 1fr 1fr" : "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem", color: "#1a3a2e" }}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={expenseForm.paymentDate}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentDate: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.5rem",
                      fontSize: "0.95rem",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem", color: "#1a3a2e" }}>
                    Mode of Payment
                  </label>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.5rem",
                      fontSize: "0.95rem",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                      cursor: "pointer",
                      backgroundColor: "#f3f4f6",
                      color: "#1a3a2e",
                    }}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Saved Payment Methods">Saved Payment Methods</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {expenseForm.paymentMethod === "Saved Payment Methods" && (
                  <div>
                    <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem", color: "#1a3a2e" }}>
                      Select Method (Optional)
                    </label>
                    <select
                      value={expenseForm.metadata?.savedCardId || ""}
                      onChange={(e) => setExpenseForm({
                        ...expenseForm,
                        metadata: { ...expenseForm.metadata, savedCardId: e.target.value }
                      })}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        border: "1px solid #e5e7eb",
                        borderRadius: "0.5rem",
                        fontSize: "0.95rem",
                        fontFamily: "inherit",
                        boxSizing: "border-box",
                        cursor: "pointer",
                        backgroundColor: "#f3f4f6",
                        color: "#1a3a2e",
                      }}
                    >
                      <option value="">Select a method...</option>
                      {paymentCards.map(card => (
                        <option key={card.id} value={card.id}>
                          {card.label} ({card.cardType})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem", color: "#1a3a2e" }}>
                  Notes / Remarks (Bank Details, etc.)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Paid using HDFC Credit Card ending in 1234"
                  value={expenseForm.metadata?.remarks || ""}
                  onChange={(e) => setExpenseForm({
                    ...expenseForm,
                    metadata: { ...expenseForm.metadata, remarks: e.target.value }
                  })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    fontSize: "0.95rem",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Proof Fields - Only show when expense type is selected */}
              {expenseForm.expenseType && EXPENSE_TYPES[expenseForm.expenseType as keyof typeof EXPENSE_TYPES]?.proofFields && (
                <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.75rem", color: "#1a3a2e" }}>
                    Required Documents
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {EXPENSE_TYPES[expenseForm.expenseType as keyof typeof EXPENSE_TYPES].proofFields.map((field: any) => (
                      <div key={field.key}>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "500", marginBottom: "0.25rem", color: "#5a6f6a" }}>
                          {field.label}
                        </label>
                        {field.type === "textarea" ? (
                          <textarea
                            placeholder={field.label}
                            value={expenseForm.metadata[field.key] || ""}
                            onChange={(e) => setExpenseForm({
                              ...expenseForm,
                              metadata: { ...expenseForm.metadata, [field.key]: e.target.value }
                            })}
                            style={{
                              width: "100%",
                              padding: "0.5rem",
                              border: "1px solid #e5e7eb",
                              borderRadius: "0.4rem",
                              fontSize: "0.85rem",
                              fontFamily: "inherit",
                              minHeight: "50px",
                              boxSizing: "border-box",
                            }}
                          />
                        ) : (
                          <input
                            type={field.type}
                            placeholder={field.label}
                            value={expenseForm.metadata[field.key] || ""}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                              }
                            }}
                            onChange={(e) => setExpenseForm({
                              ...expenseForm,
                              metadata: { ...expenseForm.metadata, [field.key]: e.target.value }
                            })}
                            style={{
                              width: "100%",
                              padding: "0.5rem",
                              border: "1px solid #e5e7eb",
                              borderRadius: "0.4rem",
                              fontSize: "0.85rem",
                              fontFamily: "inherit",
                              boxSizing: "border-box",
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem", color: "#1a3a2e" }}>
                  Description
                </label>
                <textarea
                  placeholder="Additional details"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    fontSize: "0.95rem",
                    fontFamily: "inherit",
                    minHeight: "60px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* File Upload */}
              <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem", color: "#1a3a2e" }}>
                  Attachments (Optional)
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.gif"
                  onChange={(e) => {
                    if (e.target.files) {
                      setExpenseForm({
                        ...expenseForm,
                        files: [...expenseForm.files, ...Array.from(e.target.files)]
                      });
                      e.target.value = "";
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    fontSize: "0.9rem",
                    cursor: "pointer",
                  }}
                />
                 {expenseForm.files.length > 0 && (
                  <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {expenseForm.files.map((file, index) => (
                      <div
                        key={`new-${index}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.5rem",
                          background: "#f9fafb",
                          border: "1px solid #e5e7eb",
                          borderRadius: "0.3rem",
                          fontSize: "0.8rem",
                        }}
                      >
                        <span style={{ color: "#5a6f6a" }}>{file.name} (New)</span>
                        <button
                          type="button"
                          onClick={() => setExpenseForm({
                            ...expenseForm,
                            files: expenseForm.files.filter((_, i) => i !== index)
                          })}
                          style={{
                            padding: "0.25rem 0.5rem",
                            background: "#e74c3c",
                            color: "white",
                            border: "none",
                            borderRadius: "0.2rem",
                            cursor: "pointer",
                            fontSize: "0.7rem",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {expenseForm.existingBills && expenseForm.existingBills.length > 0 && (
                  <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <p style={{ margin: "0", fontSize: "0.85rem", fontWeight: "600", color: "#5a6f6a" }}>Previously Uploaded:</p>
                    {expenseForm.existingBills.map((bill: any) => (
                      <div
                        key={`existing-${bill.id}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.5rem",
                          background: "#f0fdf4",
                          border: "1px solid #d1fae5",
                          borderRadius: "0.3rem",
                          fontSize: "0.8rem",
                        }}
                      >
                        <span style={{ color: "#166534", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          📄 <a href={`/api/files/${bill.id}`} target="_blank" rel="noreferrer" style={{ color: "#166534", textDecoration: "underline" }}>{bill.fileName}</a>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteExistingBill(bill.id)}
                          style={{
                            padding: "0.25rem 0.5rem",
                            background: "#ef4444",
                            color: "white",
                            border: "none",
                            borderRadius: "0.2rem",
                            cursor: "pointer",
                            fontSize: "0.7rem",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    background: "#1b5e3f",
                    color: "white",
                    border: "none",
                    borderRadius: "0.5rem",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  {sidebarView === "edit-expense" ? "Save Changes" : "Add Expense"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSidebarView(selectedTripId ? "trip-detail" : "trips");
                    setShowAddExpenseForm(false);
                    setEditingExpenseId(null);
                  }}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    background: "white",
                    color: "#1b5e3f",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Trip Detail View with Expense Summary */}
          {sidebarView === "trip-detail" && tripDetails && (
            <div>
              {/* Trip Header */}
              <div style={{ paddingBottom: "1.5rem", borderBottom: "1px solid #e5e7eb", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <div>
                    <h3 style={{ margin: "0 0 0.5rem 0", color: "#1a3a2e", fontSize: "1.1rem", fontWeight: "700" }}>
                      {tripDetails.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTripId(tripDetails.id);
                      setExpenseForm({ title: "", amount: "", category: "Travel", expenseType: "", paymentDate: getTodayDate(), paymentMethod: "Cash", currency: "INR", description: "", metadata: {}, files: [], existingBills: [] });
                      setSidebarView("add-expense");
                    }}
                    style={{ padding: "0.5rem 1rem", background: "#1b5e3f", color: "white", border: "none", borderRadius: "0.5rem", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}
                  >
                    ➕ Add Expense
                  </button>
                </div>
                <p style={{ margin: "0.25rem 0", color: "#5a6f6a", fontSize: "0.9rem" }}>
                  <strong>Date:</strong> {new Date(tripDetails.startDate).toLocaleDateString()}
                </p>
                {tripDetails.purpose && (
                  <p style={{ margin: "0.25rem 0", color: "#5a6f6a", fontSize: "0.9rem" }}>
                    <strong>Purpose:</strong> {tripDetails.purpose}
                  </p>
                )}
                <p style={{ margin: "0.5rem 0", color: "#5a6f6a", fontSize: "0.9rem" }}>
                  <strong>Total Amount:</strong> <span style={{ fontSize: "1.1rem", fontWeight: "700", color: "#1b5e3f" }}>₹{(tripDetails.totalAmount || 0).toFixed(2)}</span>
                </p>
                <p style={{ margin: "0.25rem 0", color: "#5a6f6a", fontSize: "0.9rem" }}>
                  <strong>Advance Drawn:</strong> ₹{tripDetails.advanceDrawn.toFixed(2)}
                </p>
              </div>

              {/* Expenses Summary by Category */}
              {loadingExpenses ? (
                <p style={{ textAlign: "center", color: "#5a6f6a", padding: "2rem 0" }}>Loading expenses...</p>
              ) : tripExpenses.length === 0 ? (
                <p style={{ textAlign: "center", color: "#5a6f6a", padding: "2rem 0" }}>No expenses yet</p>
              ) : (
                <div>
                  {/* Group expenses by category */}
                  {["Travel", "Food", "Accommodation", "Other", "Personal"].map((category) => {
                    const categoryExpenses = tripExpenses.filter((e) => e.category === category);
                    if (categoryExpenses.length === 0) return null;

                    const categoryTotal = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);

                    return (
                      <div
                        key={category}
                        style={{
                          marginBottom: "1.5rem",
                          padding: "1rem",
                          background: "#f9fafb",
                          border: "1px solid #e5e7eb",
                          borderRadius: "0.75rem",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                          <h4 style={{ margin: "0", color: "#1a3a2e", fontSize: "0.95rem", fontWeight: "700" }}>
                            {category}
                          </h4>
                          <span style={{ fontSize: "0.95rem", fontWeight: "700", color: "#1b5e3f" }}>
                            ₹{categoryTotal.toFixed(2)}
                          </span>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          {categoryExpenses.map((expense: any) => (
                            <div
                              key={expense.id}
                              onClick={() => setExpandedExpenseId(expandedExpenseId === expense.id ? null : expense.id)}
                              style={{
                                padding: "0.75rem",
                                background: expandedExpenseId === expense.id ? "#f0fdf4" : "white",
                                border: "1px solid #d1e8dd",
                                borderRadius: "0.5rem",
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.5rem",
                                cursor: "pointer",
                                transition: "all 0.2s"
                              }}
                            >
                              {/* Row 1: Title and Amount */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ margin: "0", color: "#1a3a2e", fontSize: "0.9rem", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {EXPENSE_TYPES[expense.expenseType as keyof typeof EXPENSE_TYPES]?.icon || "🧾"} {expense.title}
                                  </p>
                                  <p style={{ margin: "0.15rem 0 0 0", color: "#5a6f6a", fontSize: "0.75rem" }}>
                                    {expense.expenseType && EXPENSE_TYPES[expense.expenseType as keyof typeof EXPENSE_TYPES]
                                      ? EXPENSE_TYPES[expense.expenseType as keyof typeof EXPENSE_TYPES].label
                                      : "N/A"}
                                  </p>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                                  <p style={{ margin: "0 0 0.4rem 0.5rem", color: "#1b5e3f", fontSize: "0.95rem", fontWeight: "700", flexShrink: 0 }}>
                                    ₹{(expense.amount || 0).toFixed(2)}
                                  </p>
                                  {expandedExpenseId !== expense.id && (
                                    <span
                                      style={{ background: "transparent", color: "#1b5e3f", padding: "0.1rem 0.3rem", borderRadius: "0.25rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.2rem", opacity: 0.8 }}
                                    >
                                      👁️ View Details
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Expanded Details */}
                              {expandedExpenseId === expense.id && (
                                <div style={{ padding: "0.75rem 0", borderTop: "1px dashed #cbd5e1", marginTop: "0.5rem", fontSize: "0.85rem", color: "#475569" }} onClick={e => e.stopPropagation()}>
                                  <p style={{ margin: "0 0 0.5rem 0" }}>📅 <strong>Date:</strong> {new Date(expense.paymentDate).toLocaleDateString()}</p>
                                  {expense.description && <p style={{ margin: "0 0 0.5rem 0" }}>📝 <strong>Description:</strong> {expense.description}</p>}
                                  
                                  {(() => {
                                     let meta = expense.metadata;
                                     if (typeof meta === "string") {
                                        try { meta = JSON.parse(meta); } catch(e) { meta = {}; }
                                     }
                                     if (!meta || Object.keys(meta).length === 0) return null;
                                     
                                     return (
                                       <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "0.35rem", marginTop: "0.5rem", marginBottom: "1rem" }}>
                                         {meta.from && <p style={{ margin: "0 0 0.25rem" }}>📍 <strong>From:</strong> {meta.from}</p>}
                                         {meta.to && <p style={{ margin: "0 0 0.25rem" }}>📍 <strong>To:</strong> {meta.to}</p>}
                                         {meta.hotelName && <p style={{ margin: "0 0 0.25rem" }}>🏨 <strong>Hotel:</strong> {meta.hotelName}</p>}
                                         {meta.billNo && <p style={{ margin: "0 0 0.25rem" }}>🧾 <strong>Bill No:</strong> {meta.billNo}</p>}
                                         {meta.pnr && <p style={{ margin: "0 0 0.25rem" }}>🎫 <strong>PNR/Ticket:</strong> {meta.pnr}</p>}
                                         {meta.numNights && <p style={{ margin: "0 0 0.25rem" }}>🌙 <strong>Nights:</strong> {meta.numNights}</p>}
                                         {meta.distance && <p style={{ margin: "0 0 0.25rem" }}>🛣️ <strong>Distance:</strong> {meta.distance} km</p>}
                                       </div>
                                     );
                                  })()}
                                  
                                  {/* Attachments */}
                                  <div style={{ marginTop: "0.5rem", marginBottom: "1rem" }}>
                                    <p style={{ margin: "0 0 0.5rem", fontWeight: "600" }}>📎 Attachments / Bills:</p>
                                    {(!expense.bills || expense.bills.length === 0) ? (
                                       <span style={{ color: "#9ca3af" }}>No attachments uploaded.</span>
                                    ) : (
                                       <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                         {expense.bills.map((b: any) => (
                                            <button key={b.id} onClick={(e) => { e.stopPropagation(); window.open(`/api/files/${b.id}`, "_blank"); }} style={{ padding: "0.25rem 0.5rem", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "0.25rem", fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                              📄 {b.fileName}
                                            </button>
                                         ))}
                                       </div>
                                    )}
                                  </div>

                                  {/* Row 2: Action Buttons */}
                                  <div style={{ display: "flex", gap: "0.5rem" }}>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); startEditExpense(expense); }}
                                      style={{
                                        flex: 1,
                                        padding: "0.35rem 0.5rem",
                                        background: "#e0f2fe",
                                        color: "#0284c7",
                                        border: "1px solid #bae6fd",
                                        borderRadius: "0.3rem",
                                        cursor: "pointer",
                                        fontSize: "0.78rem",
                                        fontWeight: "600",
                                      }}
                                    >
                                      ✏️ Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteExpense(e, expense.id)}
                                      style={{
                                        flex: 1,
                                        padding: "0.35rem 0.5rem",
                                        background: "#fee2e2",
                                        color: "#dc2626",
                                        border: "1px solid #fecaca",
                                        borderRadius: "0.3rem",
                                        cursor: "pointer",
                                        fontSize: "0.78rem",
                                        fontWeight: "600",
                                      }}
                                    >
                                      🗑️ Delete
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "2rem" }}>
                <button
                  onClick={() => {
                    setSelectedTripId(tripDetails.id);
                    setSidebarView("add-expense");
                    setShowAddExpenseForm(true);
                  }}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    background: "#1b5e3f",
                    color: "white",
                    border: "none",
                    borderRadius: "0.5rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#0f4c2f";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#1b5e3f";
                  }}
                >
                  + Add Expense
                </button>
                <button
                  onClick={() => setSidebarView("trips")}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    background: "white",
                    color: "#1b5e3f",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "white";
                  }}
                >
                  Back
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 overflow-y-auto ${sidebarView === "trips" ? "block" : "hidden"} bg-gray-50/50 p-6 md:p-10 h-full`}>
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
          

          {/* Filter Tabs & Search/Sort */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-2 rounded-xl border border-gray-200 shadow-sm animate-fade-in-up delay-1">
            <div className="flex w-full md:w-auto p-1 bg-gray-50 rounded-lg border border-gray-100">
              {[
                { id: "active", label: "Active Trips", icon: Plane },
                { id: "favorites", label: "Wishlist", icon: Star },
                { id: "archived", label: "Archived", icon: Archive }
              ].map(f => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFilterView(f.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all flex-1 md:flex-none justify-center ${
                      filterView === f.id 
                        ? "bg-white text-[var(--primary)] shadow-sm border border-gray-200" 
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                    }`}
                  >
                    <Icon size={16} className={filterView === f.id ? "text-[var(--primary)]" : "text-gray-400"} />
                    <span className="hidden sm:inline">{f.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex w-full md:w-auto gap-3 items-center px-2 pb-2 md:pb-0">
              <input 
                type="text" 
                placeholder="Search trips..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full md:w-48 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-lightest)] transition-all outline-none"
              />
              <select 
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-lightest)] transition-all outline-none cursor-pointer"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">Amount: High to Low</option>
                <option value="amount-asc">Amount: Low to High</option>
                <option value="title-asc">Title: A-Z</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between animate-fade-in-up delay-2">
            <h2 className="text-xl font-bold text-gray-900">
              {filterView === "active" ? "My Trips" : filterView === "favorites" ? "Wishlist" : "Archived Trips"}
            </h2>
            <button
              onClick={() => {
                setSidebarView("add-trip");
                setShowNewTripForm(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] text-white rounded-xl font-semibold shadow-sm hover:shadow-md hover:from-[#134d32] hover:to-[#1b5e3f] transition-all transform hover:-translate-y-0.5"
            >
              <Plus size={18} />
              Create Trip
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="spinner !w-8 !h-8" />
            </div>
          ) : trips.length === 0 ? (
            <div className="animate-fade-in-up delay-3 bg-[var(--bg-secondary)] rounded-2xl p-16 text-center border-2 border-dashed border-[var(--primary-lighter)]">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-[image:var(--gradient-primary)] flex items-center justify-center mb-6">
                <Plane size={36} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--primary)] mb-3">No trips yet!</h2>
              <p className="text-gray-600 mb-8 max-w-lg mx-auto text-base">
                Create your first trip to start tracking your expenses and reimbursements.
              </p>
              <button
                onClick={() => {
                  setSidebarView("add-trip");
                  setShowNewTripForm(true);
                }}
                className="px-8 py-3 bg-[var(--primary)] text-white rounded-xl font-bold hover:bg-[#134d32] transition-colors inline-flex items-center gap-2"
              >
                <Plus size={20} />
                Create Trip
              </button>
            </div>
          ) : (() => {
            const filteredAndSortedTrips = trips
              .filter(t => filterView === "favorites" ? t.isFavorite : filterView === "archived" ? t.isArchived : !t.isArchived)
              .filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || (t.purpose && t.purpose.toLowerCase().includes(searchQuery.toLowerCase())))
              .sort((a, b) => {
                if (sortBy === "date-desc") return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
                if (sortBy === "date-asc") return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
                if (sortBy === "amount-desc") return (b.totalAmount || 0) - (a.totalAmount || 0);
                if (sortBy === "amount-asc") return (a.totalAmount || 0) - (b.totalAmount || 0);
                if (sortBy === "title-asc") return a.title.localeCompare(b.title);
                return 0;
              });

            if (filteredAndSortedTrips.length === 0) {
              return (
                <div className="py-20 text-center text-gray-500">
                  <p>No trips match your current filters and search.</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredAndSortedTrips.map((trip, idx) => {
                  // Club Portal exact styling translation!
                  const isCompleted = trip.isCompleted;
                  const borderClass = isCompleted ? "border-emerald-400" : "border-blue-400";
                  const bgClass = isCompleted ? "bg-gradient-to-br from-emerald-50/80 to-white" : "bg-gradient-to-br from-blue-50/80 to-white";
                  const headingBg = isCompleted ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-blue-600 to-indigo-600";
                  const avatarGradient = isCompleted ? "from-emerald-500 to-teal-600" : "from-blue-600 to-indigo-700";
                  
                  return (
                  <div
                    key={trip.id}
                    className={`rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border-2 ${borderClass} ${bgClass} overflow-hidden animate-fade-in-up delay-${Math.min(idx + 1, 5)} group`}
                  >
                    {/* Top Strip */}
                    <div className={`${headingBg} px-5 py-3 flex items-center justify-between text-white`}>
                      <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        {isCompleted ? <span className="w-2 h-2 rounded-full bg-white" /> : <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                        {isCompleted ? "Completed" : "Ongoing"}
                      </span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => toggleFavorite(e, trip)} 
                          className="hover:scale-110 transition-transform"
                          title={trip.isFavorite ? "Remove from Wishlist" : "Add to Wishlist"}
                        >
                          <Star size={16} className={trip.isFavorite ? "fill-yellow-300 text-yellow-300" : "text-white/70 hover:text-white"} />
                        </button>
                        <button 
                          onClick={(e) => toggleArchive(e, trip)} 
                          className="hover:scale-110 transition-transform ml-1"
                          title={trip.isArchived ? "Unarchive" : "Archive"}
                        >
                          <Archive size={16} className={trip.isArchived ? "fill-white/30 text-white" : "text-white/70 hover:text-white"} />
                        </button>
                      </div>
                    </div>

                    {/* Main Card Content */}
                    <div className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white font-bold text-xl shadow-sm shrink-0`}>
                          {trip.title.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-xl text-gray-900 truncate mb-1" title={trip.title}>
                            {trip.title}
                          </h3>
                          <p className="text-sm text-gray-500 font-medium flex items-center gap-1">
                            <Calendar size={14} className="text-gray-400" />
                            {new Date(trip.startDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="bg-white/60 rounded-xl p-4 mb-5 border border-white">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Expenses</span>
                          <span className="text-lg font-bold text-gray-900">₹{(trip.totalAmount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Advance</span>
                          <span className="text-sm font-semibold text-gray-600">₹{trip.advanceDrawn.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-4 border-t border-gray-200/50">
                        {/* Quick Actions (Club Management Portal style) */}
                        <button
                          onClick={() => {
                            setSelectedTripId(trip.id);
                            setTripDetails(trip);
                            setSidebarView("trip-detail");
                            fetchTripExpenses(trip.id);
                          }}
                          className="flex-1 p-2.5 bg-gray-50 hover:bg-[var(--primary-lightest)] text-gray-600 hover:text-[var(--primary)] rounded-xl transition-colors flex items-center justify-center gap-2 group/btn border border-gray-100"
                          title="View Details"
                        >
                          <Eye size={18} className="transition-transform group-hover/btn:scale-110" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTripId(trip.id);
                            setSidebarView("add-expense");
                            setShowAddExpenseForm(true);
                          }}
                          className="flex-1 p-2.5 bg-gray-50 hover:bg-[var(--primary-lightest)] text-gray-600 hover:text-[var(--primary)] rounded-xl transition-colors flex items-center justify-center gap-2 group/btn border border-gray-100"
                          title="Add Expense"
                        >
                          <Plus size={18} className="transition-transform group-hover/btn:scale-110" />
                        </button>
                        <button
                          onClick={(e) => deleteTrip(e, trip)}
                          className="p-2.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl"
                          title="Delete Trip"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ); })()}
        </div>
      </div>
    </div>
  );
});
