"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { FormSection } from "@/types/forms";
import { OfflineGuard } from "@/components/OfflineGuard";

interface FormTemplate {
  id: string;
  title: string;
  description?: string;
  isActive: boolean;
  version: number;
  templateSchema?: string;
}

interface GroupInfo {
  id: string;
  name: string;
  groupId: string;
  description: string | null;
}

interface TripOption {
  id: string;
  title: string;
  startDate: string;
  purpose?: string | null;
  budgetHead?: string | null;
  advanceDrawn?: number;
  totalAmount?: number;
  expenseCount?: number;
}

interface ExpenseOption {
  id: string;
  title: string;
  amount: number;
  category: string;
  expenseType: string;
  currency: string;
  paymentDate: string;
  description?: string | null;
  vendor?: string | null;
  metadata?: string | null;
}

export default function GroupFormsPage({ params }: { params: Promise<{ groupId: string }> }) {
  return (
    <OfflineGuard featureName="Form filling">
      <GroupFormsContent params={params} />
    </OfflineGuard>
  );
}

function GroupFormsContent({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const router = useRouter();
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<FormTemplate | null>(null);
  const [formSections, setFormSections] = useState<FormSection[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [tripExpenses, setTripExpenses] = useState<ExpenseOption[]>([]);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(new Set());
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGroupForms();
    fetchTrips();
  }, [groupId]);

  useEffect(() => {
    const updateViewport = () => setIsMobile(window.innerWidth < 640);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const selectedTrip = trips.find((trip) => trip.id === selectedTripId);
  const selectedExpenses = tripExpenses.filter((expense) => selectedExpenseIds.has(expense.id));

  const fetchGroupForms = async () => {
    try {
      // Fetch group info
      const groupRes = await fetch(`/api/groups/${groupId}`);
      if (!groupRes.ok) {
        setError("Group not found or you don't have access.");
        setLoading(false);
        return;
      }
      const groupData = await groupRes.json();
      setGroup(groupData.group);

      // Fetch active forms for this group
      const formsRes = await fetch(`/api/forms?active=true&groupId=${groupId}`);
      if (formsRes.ok) {
        const formsData = await formsRes.json();
        setForms(formsData.forms || []);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load group data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTrips = async () => {
    try {
      const res = await fetch("/api/trips");
      if (!res.ok) return;
      const data = await res.json();
      setTrips(data.trips || []);
    } catch (err) {
      console.error("Failed to load trips:", err);
    }
  };

  const parseExpenseMetadata = (expense: ExpenseOption) => {
    if (!expense.metadata) return {};
    try {
      return typeof expense.metadata === "string" ? JSON.parse(expense.metadata) : expense.metadata;
    } catch {
      return {};
    }
  };

  const getExpenseGroup = (expense: ExpenseOption) => {
    const raw = `${expense.category || ""} ${expense.expenseType || ""}`.toLowerCase();
    if (raw.includes("accommodation") || raw.includes("lodging") || raw.includes("hotel")) return "Accommodation";
    if (raw.includes("food") || raw.includes("meal") || raw.includes("restaurant")) return "Food";
    if (raw.includes("travel") || raw.includes("taxi") || raw.includes("train") || raw.includes("flight") || raw.includes("bus")) return "Travel";
    return "Other";
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "";
    return new Date(value).toISOString().slice(0, 10);
  };

  const formatExpenseLine = (expense: ExpenseOption) => {
    const metadata = parseExpenseMetadata(expense);
    const route = metadata.from && metadata.to ? ` (${metadata.from} to ${metadata.to})` : "";
    const vendor = expense.vendor ? ` - ${expense.vendor}` : "";
    return `${formatDate(expense.paymentDate)} - ${expense.title}${route}${vendor} - ${expense.currency || "INR"} ${Number(expense.amount || 0).toFixed(2)}`;
  };

  const autoFillFromTrip = (
    currentData: Record<string, any>,
    trip: TripOption | undefined,
    expenses: ExpenseOption[]
  ) => {
    const next = { ...currentData };
    const grouped = expenses.reduce<Record<string, ExpenseOption[]>>((acc, expense) => {
      const group = getExpenseGroup(expense);
      acc[group] = [...(acc[group] || []), expense];
      return acc;
    }, {});

    const totalFor = (items: ExpenseOption[] = []) => items.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const summaryFor = (items: ExpenseOption[] = []) => items.map(formatExpenseLine).join("\n");

    formSections.forEach((section) => {
      const sectionTitle = (section.title || "").toLowerCase();
      (section.fields || []).forEach((field: any) => {
        const label = `${sectionTitle} ${field.label || ""}`.toLowerCase();

        if (trip && (label.includes("trip") || label.includes("journey") || label.includes("tour"))) {
          if (label.includes("date") || label.includes("start")) {
            next[field.id] = formatDate(trip.startDate);
          } else if (label.includes("purpose")) {
            next[field.id] = trip.purpose || "";
          } else if (label.includes("budget")) {
            next[field.id] = trip.budgetHead || "";
          } else if (label.includes("advance")) {
            next[field.id] = trip.advanceDrawn || 0;
          } else {
            next[field.id] = trip.title;
          }
        }

        const category = ["Travel", "Accommodation", "Food", "Other"].find((name) =>
          label.includes(name.toLowerCase())
        );

        if (category) {
          const items = grouped[category] || [];
          if (label.includes("amount") || label.includes("total") || field.type === "number") {
            next[field.id] = items.length ? totalFor(items).toFixed(2) : "";
          } else {
            next[field.id] = summaryFor(items);
          }
        } else if (label.includes("expense") && expenses.length) {
          if (label.includes("amount") || label.includes("total") || field.type === "number") {
            next[field.id] = totalFor(expenses).toFixed(2);
          } else {
            next[field.id] = summaryFor(expenses);
          }
        }
      });
    });

    next._selectedTrip = trip ? {
      id: trip.id,
      title: trip.title,
      startDate: trip.startDate,
      purpose: trip.purpose,
      budgetHead: trip.budgetHead,
    } : null;
    next._selectedExpenses = expenses.map((expense) => ({
      id: expense.id,
      title: expense.title,
      category: expense.category,
      expenseType: expense.expenseType,
      amount: expense.amount,
      currency: expense.currency,
      paymentDate: expense.paymentDate,
      vendor: expense.vendor,
      metadata: parseExpenseMetadata(expense),
    }));

    return next;
  };

  const handleTripSelect = async (tripId: string) => {
    setSelectedTripId(tripId);
    setSelectedExpenseIds(new Set());
    setTripExpenses([]);

    const trip = trips.find((item) => item.id === tripId);
    setFormData((prev) => autoFillFromTrip(prev, trip, []));

    if (!tripId) return;
    setExpensesLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/expenses`);
      if (!res.ok) throw new Error("Failed to load trip expenses");
      const data = await res.json();
      setTripExpenses(data.expenses || []);
    } catch (err) {
      console.error(err);
      setError("Could not load expenses for this trip.");
    } finally {
      setExpensesLoading(false);
    }
  };

  const toggleExpenseSelection = (expenseId: string) => {
    const nextSelected = new Set(selectedExpenseIds);
    if (nextSelected.has(expenseId)) {
      nextSelected.delete(expenseId);
    } else {
      nextSelected.add(expenseId);
    }

    setSelectedExpenseIds(nextSelected);
    const expenses = tripExpenses.filter((expense) => nextSelected.has(expense.id));
    setFormData((prev) => autoFillFromTrip(prev, selectedTrip, expenses));
  };

  const handleSelectForm = async (form: FormTemplate) => {
    try {
      const res = await fetch(`/api/forms/${form.id}`);
      if (!res.ok) throw new Error("Failed to load form");
      const data = await res.json();
      const schema = typeof data.form.templateSchema === "string"
        ? JSON.parse(data.form.templateSchema)
        : data.form.templateSchema;
      setFormSections(schema.sections || []);
      setFormSections(schema.sections || []);
      setSelectedForm(data.form);
      
      const draftKey = `reimbursify_draft_${groupId}_${form.id}`;
      const draftDataStr = localStorage.getItem(draftKey);
      
      if (draftDataStr && confirm("A saved draft was found for this form. Do you want to load it?")) {
        try {
          const draftData = JSON.parse(draftDataStr);
          setFormData(draftData.formData || {});
          setSelectedTripId(draftData.selectedTripId || "");
          setSelectedExpenseIds(new Set(draftData.selectedExpenseIds || []));
          
          if (draftData.selectedTripId) {
            setExpensesLoading(true);
            fetch(`/api/trips/${draftData.selectedTripId}/expenses`)
              .then(r => r.json())
              .then(d => setTripExpenses(d.expenses || []))
              .catch(console.error)
              .finally(() => setExpensesLoading(false));
          } else {
            setTripExpenses([]);
          }
        } catch(e) {
          console.error("Failed to load draft", e);
          setFormData({});
          setSelectedTripId("");
          setTripExpenses([]);
          setSelectedExpenseIds(new Set());
        }
      } else {
        setFormData({});
        setSelectedTripId("");
        setTripExpenses([]);
        setSelectedExpenseIds(new Set());
      }
      
      setSuccess(null);
      setError(null);
    } catch (err) {
      setError("Failed to load form template.");
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSaveDraft = () => {
    if (!selectedForm) return;
    const draftKey = `reimbursify_draft_${groupId}_${selectedForm.id}`;
    const draftData = {
      formData,
      selectedTripId,
      selectedExpenseIds: Array.from(selectedExpenseIds),
    };
    localStorage.setItem(draftKey, JSON.stringify(draftData));
    setSuccess("Draft saved locally! You can safely close this page and continue later.");
    setTimeout(() => {
      setSuccess(prev => prev === "Draft saved locally! You can safely close this page and continue later." ? null : prev);
    }, 5000);
  };

  const handleSubmitForm = async () => {
    if (!selectedForm) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedForm.id,
          tripId: selectedTripId || undefined,
          formData,
          expenseSelections: Array.from(selectedExpenseIds),
          status: "SUBMITTED",
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to submit");
      }
      
      const draftKey = `reimbursify_draft_${groupId}_${selectedForm.id}`;
      localStorage.removeItem(draftKey);
      
      setSuccess("Form submitted successfully!");
      setSelectedForm(null);
      setFormData({});
      setSelectedTripId("");
      setTripExpenses([]);
      setSelectedExpenseIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>;
  }

  if (error && !group) {
    return (
      <div style={{ padding: "3rem", textAlign: "center" }}>
        <p style={{ color: "#ef4444", fontWeight: 600 }}>{error}</p>
        <button onClick={() => router.push("/groups")} style={{ marginTop: "1rem", padding: "0.5rem 1rem", background: "var(--primary)", color: "white", border: "none", borderRadius: "0.5rem", cursor: "pointer" }}>
          ← Back to Groups
        </button>
      </div>
    );
  }

  // Form filling view
  if (selectedForm && formSections.length > 0) {
    return (
      <div style={{ padding: isMobile ? "1rem" : "3rem", maxWidth: "800px", margin: "0 auto" }}>
        <button
          onClick={() => {
            setSelectedForm(null);
            setFormData({});
            setSelectedTripId("");
            setTripExpenses([]);
            setSelectedExpenseIds(new Set());
            setError(null);
          }}
          style={{ marginBottom: "1.5rem", padding: "0.5rem 1rem", background: "transparent", border: "1px solid var(--border)", borderRadius: "0.5rem", cursor: "pointer", fontWeight: 600, color: "var(--text-secondary)" }}
        >
          ← Back to Forms
        </button>

        <div style={{ background: "white", borderRadius: isMobile ? "0.75rem" : "1rem", border: "1px solid var(--border)", overflow: "hidden" }}>
          <div style={{ background: "linear-gradient(135deg, #1b5e3f 0%, #2d7d5a 100%)", padding: isMobile ? "1.25rem" : "2rem", color: "white" }}>
            {(() => {
              try {
                const schema = typeof selectedForm.templateSchema === "string" ? JSON.parse(selectedForm.templateSchema) : selectedForm.templateSchema;
                const meta = schema?.metadata;
                if (meta?.instituteHeading) {
                  return (
                    <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
                      <div style={{ fontSize: isMobile ? "1rem" : "1.2rem", fontWeight: 800 }}>{meta.instituteHeading}</div>
                      <div style={{ fontSize: isMobile ? "1rem" : "1.15rem", fontWeight: 800, letterSpacing: "0.03em" }}>{meta.instituteNameEn}</div>
                      <div style={{ fontSize: "0.85rem", opacity: 0.9, marginTop: "0.25rem", letterSpacing: "0.05em" }}>{meta.formHeadingEn}</div>
                    </div>
                  );
                }
              } catch {}
              return null;
            })()}
            <h2 style={{ margin: 0, fontSize: isMobile ? "1.1rem" : "1.3rem", fontWeight: 800, lineHeight: 1.2, textAlign: "center" }}>{selectedForm.title}</h2>
            {selectedForm.description && <p style={{ margin: "0.5rem 0 0", opacity: 0.9, fontSize: "0.85rem", textAlign: "center" }}>{selectedForm.description}</p>}
          </div>

          <div style={{ padding: isMobile ? "1rem" : "2rem" }}>
            {error && <div style={{ padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "0.5rem", color: "#991b1b", marginBottom: "1.5rem", fontWeight: 600, fontSize: "0.9rem" }}>⚠️ {error}</div>}

            <div style={{ marginBottom: "2rem", padding: isMobile ? "1rem" : "1.25rem", border: "1px solid #cfe7dc", borderRadius: "0.75rem", background: "#f6fbf8" }}>
              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", gap: "1rem", alignItems: isMobile ? "stretch" : "flex-start", marginBottom: "1rem" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#164c34" }}>Trip Selection</h3>
                  <p style={{ margin: "0.25rem 0 0", color: "#5a6f6a", fontSize: "0.85rem", lineHeight: 1.4 }}>
                    Choose a trip to associate with this form and automatically load its expenses.
                  </p>
                </div>
                {selectedExpenses.length > 0 && (
                  <div style={{ padding: "0.5rem 0.75rem", background: "white", border: "1px solid #cfe7dc", borderRadius: "0.5rem", color: "#164c34", fontWeight: 800, whiteSpace: "nowrap", alignSelf: isMobile ? "flex-start" : "auto" }}>
                    {selectedExpenses.length} expense(s) included
                  </div>
                )}
              </div>

              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#164c34", marginBottom: "0.5rem" }}>
                Select trip
              </label>
              <select
                value={selectedTripId}
                onChange={(e) => handleTripSelect(e.target.value)}
                style={{ width: "100%", padding: "0.75rem", border: "1px solid #b8dacb", borderRadius: "0.5rem", fontSize: "0.95rem", boxSizing: "border-box", background: "white", color: "#123c2a" }}
              >
                <option value="">Select a trip...</option>
                {trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.title} - {formatDate(trip.startDate)}{trip.expenseCount !== undefined ? ` (${trip.expenseCount} expenses)` : ""}
                  </option>
                ))}
              </select>

              {trips.length === 0 && (
                <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: "white", border: "1px dashed #b8dacb", borderRadius: "0.5rem", color: "#5a6f6a", fontSize: "0.9rem" }}>
                  No trips found yet. Create a trip and add expenses first, then come back to fill this form.
                </div>
              )}

              {selectedTrip && (
                <div style={{ marginTop: "1rem", padding: "0.875rem", background: "white", border: "1px solid #d8eee4", borderRadius: "0.5rem" }}>
                  <div style={{ fontWeight: 800, color: "#164c34", marginBottom: "0.35rem" }}>{selectedTrip.title}</div>
                  <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", flexWrap: "wrap", gap: "0.5rem", color: "#5a6f6a", fontSize: "0.82rem", fontWeight: 600 }}>
                    <span>Start: {formatDate(selectedTrip.startDate)}</span>
                    {selectedTrip.purpose && <span>Purpose: {selectedTrip.purpose}</span>}
                    {selectedTrip.budgetHead && <span>Budget: {selectedTrip.budgetHead}</span>}
                  </div>
                </div>
              )}


            </div>

            {formSections.map((section, sIdx) => (
              <div key={(section as any).id || sIdx} style={{ marginBottom: "2rem" }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1b5e3f", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "2px solid #d1fae5", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {(section as any).title}
                </h3>
                {(section as any).description && <p style={{ fontSize: "0.82rem", color: "#6b7280", marginBottom: "1rem" }}>{(section as any).description}</p>}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {((section as any).fields || []).map((field: any) => {
                    if (field.type === "staticText") {
                      const txt = field.value || field.label;
                      if (!txt) return null;
                      return <div key={field.id} style={{ background: "#f8fafc", padding: "1rem", borderRadius: "0.5rem", color: "#475569", fontSize: "0.88rem", whiteSpace: "pre-wrap", border: "1px solid #e2e8f0", lineHeight: 1.6 }}>{txt}</div>;
                    }
                    if (field.type === "expense_cards_table" || field.type === "accommodation_cards_table" || field.type === "other_expenses_table") {
                      const isTravel = field.type === "expense_cards_table";
                      const isAccomm = field.type === "accommodation_cards_table";
                      const filtered = tripExpenses.filter(e => {
                        const cat = (e.category || "").toLowerCase();
                        const et = (e.expenseType || "").toLowerCase();
                        if (isTravel) return cat === "travel" || ["airways","train","taxi","bus","own_car"].includes(et);
                        if (isAccomm) return cat === "accommodation" || ["lodging","guest_house"].includes(et);
                        return cat !== "travel" && !["airways","train","taxi","bus","own_car"].includes(et) && cat !== "accommodation" && !["lodging","guest_house"].includes(et);
                      });
                      if (!selectedTripId) return <div key={field.id} style={{ padding: "1rem", background: "#fef9c3", border: "1px solid #fde68a", borderRadius: "0.5rem", color: "#92400e", fontSize: "0.85rem" }}>⚠️ Select a trip above to load expenses for: <strong>{field.label}</strong></div>;
                      if (expensesLoading) return <div key={field.id} style={{ padding: "1rem", textAlign: "center", color: "#6b7280" }}>⏳ Loading…</div>;
                      return (
                        <div key={field.id}>
                          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#164c34", marginBottom: "0.5rem" }}>{field.label}</div>
                          {filtered.length === 0 ? (
                            <div style={{ padding: "1rem", background: "#f9fafb", border: "1px dashed #d1d5db", borderRadius: "0.5rem", color: "#6b7280", fontSize: "0.85rem", textAlign: "center" }}>No matching expenses in this trip.</div>
                          ) : (
                            <div style={{ display: "grid", gap: "0.5rem" }}>
                              {filtered.map(exp => {
                                const chk = selectedExpenseIds.has(exp.id);
                                return (
                                  <label key={exp.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "0.75rem", alignItems: "center", padding: "0.75rem", border: chk ? "2px solid #1b5e3f" : "1px solid #e2e8f0", borderRadius: "0.6rem", background: chk ? "#f0f9f7" : "#fff", cursor: "pointer" }}>
                                    <input type="checkbox" checked={chk} onChange={() => toggleExpenseSelection(exp.id)} style={{ width: "1rem", height: "1rem", accentColor: "#1b5e3f" }} />
                                    <span>
                                      <span style={{ display: "block", fontWeight: 800, color: "#16382b", fontSize: "0.9rem" }}>{exp.title}</span>
                                      <span style={{ display: "block", color: "#64748b", fontSize: "0.78rem" }}>{exp.expenseType} · {new Date(exp.paymentDate).toLocaleDateString("en-IN")}</span>
                                    </span>
                                    <span style={{ color: "#164c34", fontWeight: 800, fontSize: "0.9rem", whiteSpace: "nowrap" }}>{exp.currency || "INR"} {Number(exp.amount).toFixed(2)}</span>
                                  </label>
                                );
                              })}
                              {filtered.some(e => selectedExpenseIds.has(e.id)) && (
                                <div style={{ padding: "0.5rem 0.75rem", background: "#dcfce7", borderRadius: "0.5rem", color: "#166534", fontWeight: 700, fontSize: "0.85rem", textAlign: "right" }}>
                                  Total: ₹{filtered.filter(e => selectedExpenseIds.has(e.id)).reduce((s,e)=>s+Number(e.amount),0).toFixed(2)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }
                    if (field.type === "signature_authority") {
                      return <div key={field.id} style={{ minHeight: "56px", border: "1px dashed #cbd5e1", borderRadius: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "0.85rem" }}>Signature of {field.label}</div>;
                    }
                    const lbl = <label key={`lbl-${field.id}`} style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.4rem", color: "var(--text-secondary)" }}>{field.label}{field.required && <span style={{ color: "#ef4444" }}> *</span>}</label>;
                    if (field.type === "yesno") {
                      return (
                        <div key={field.id}>
                          {lbl}
                          <div style={{ display: "flex", gap: "1.5rem" }}>
                            {["Yes","No"].map(opt => (
                              <label key={opt} style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
                                <input type="radio" name={field.id} value={opt} checked={formData[field.id] === opt} onChange={() => handleFieldChange(field.id, opt)} style={{ accentColor: "#1b5e3f" }} />{opt}
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={field.id}>
                        {lbl}
                        {field.type === "long_text" || field.type === "textarea" ? (
                          <textarea value={formData[field.id] || ""} onChange={e => handleFieldChange(field.id, e.target.value)} rows={3} style={{ width: "100%", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.5rem", fontSize: "0.95rem", fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }} />
                        ) : field.type === "date" ? (
                          <input type="date" value={formData[field.id] || ""} onChange={e => handleFieldChange(field.id, e.target.value)} style={{ width: "100%", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.5rem", fontSize: "0.95rem", boxSizing: "border-box" }} />
                        ) : field.type === "number" ? (
                          <input type="number" value={formData[field.id] || ""} onChange={e => handleFieldChange(field.id, e.target.value)} style={{ width: "100%", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.5rem", fontSize: "0.95rem", boxSizing: "border-box" }} />
                        ) : (
                          <input type="text" value={formData[field.id] || ""} onChange={e => handleFieldChange(field.id, e.target.value)} placeholder={field.placeholder || ""} autoComplete="off" style={{ width: "100%", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.5rem", fontSize: "0.95rem", boxSizing: "border-box" }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={handleSubmitForm}
                disabled={submitting}
                style={{
                  padding: "0.875rem 2rem",
                  background: submitting ? "#94a3b8" : "linear-gradient(135deg, #1b5e3f 0%, #2d7d5a 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "0.75rem",
                  fontWeight: 700,
                  fontSize: "1rem",
                  cursor: submitting ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 12px rgba(27, 94, 63, 0.3)",
                }}
              >
                {submitting ? "Submitting..." : "Submit Form"}
              </button>
              
              <button
                onClick={handleSaveDraft}
                disabled={submitting}
                style={{
                  padding: "0.875rem 2rem",
                  background: "transparent",
                  color: "#1b5e3f",
                  border: "2px solid #1b5e3f",
                  borderRadius: "0.75rem",
                  fontWeight: 700,
                  fontSize: "1rem",
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                Save Draft
              </button>

              {success && success.includes("Draft saved") && (
                <span style={{ color: "#059669", fontWeight: 600, fontSize: "0.9rem" }}>✅ {success}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Group forms list view
  return (
    <div style={{ padding: isMobile ? "1rem" : "3rem", maxWidth: "1000px", margin: "0 auto" }}>
      <button
        onClick={() => router.push("/groups")}
        style={{ marginBottom: "1.5rem", padding: "0.5rem 1rem", background: "transparent", border: "1px solid var(--border)", borderRadius: "0.5rem", cursor: "pointer", fontWeight: 600, color: "var(--text-secondary)" }}
      >
        ← Back to Groups
      </button>

      {success && <div style={{ padding: "0.75rem 1rem", background: "#f0fdf4", border: "1px solid #a7f3d0", borderRadius: "0.5rem", color: "#065f46", marginBottom: "1.5rem", fontWeight: 600, fontSize: "0.9rem" }}>✅ {success}</div>}
      {error && <div style={{ padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "0.5rem", color: "#991b1b", marginBottom: "1.5rem", fontWeight: 600, fontSize: "0.9rem" }}>⚠️ {error}</div>}

      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>{group?.name}</h1>
        {group?.description && <p style={{ color: "var(--text-muted)", margin: "0.5rem 0 0", fontSize: "0.95rem" }}>{group.description}</p>}
      </div>

      {forms.length === 0 ? (
        <div style={{ background: "white", padding: "4rem 2rem", borderRadius: "1rem", textAlign: "center", border: "1px dashed var(--border)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📋</div>
          <h3 style={{ fontSize: "1.25rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>No Active Forms</h3>
          <p style={{ color: "var(--text-muted)" }}>There are no active forms in this group yet.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
          {forms.map(form => (
            <div
              key={form.id}
              onClick={() => handleSelectForm(form)}
              style={{
                background: "white",
                borderRadius: "1rem",
                padding: "1.75rem",
                boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
                border: "1px solid rgba(0,0,0,0.05)",
                cursor: "pointer",
                transition: "all 0.2s",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.05)";
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(90deg, #10b981, #34d399)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "0.75rem", background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "1.1rem", flexShrink: 0 }}>📋</div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{form.title}</h3>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0, lineHeight: 1.5 }}>
                {form.description || "Click to fill out this form"}
              </p>
              <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "0.2rem 0.6rem", borderRadius: "9999px", border: "1px solid #a7f3d0" }}>v{form.version}.0</span>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--primary)" }}>Fill Form →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
