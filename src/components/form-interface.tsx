"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Download, Send, ChevronLeft, AlertCircle, CheckCircle } from "lucide-react";
import {
  getCachedForm,
  cacheForms,
  getCachedExpensesByTrip,
  cacheExpenses,
  cacheSingleSubmission,
} from "@/lib/offline-db";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormTemplate {
  id: string;
  title: string;
  description?: string;
  templateSchema?: { sections: any[]; metadata?: any };
  fields?: any[];
  version: number;
}

interface TripBasic {
  id: string;
  title: string;
  startDate?: string;
}

interface FullExpense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  expenseType: string;
  category: string;
  paymentDate: string;
  vendor?: string;
  billNumber?: string;
  numDays?: number;
  description?: string;
  metadata: Record<string, any>;
  status: string;
}

interface FormInterfaceProps {
  tripId: string;
  formId: string;
  trip?: { id: string; title: string; expenses: any[] };
  onSubmit?: (data: any) => void;
  onBack?: () => void;
  submissionData?: any; // If provided, renders in read-only mode for viewing/printing
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPENSE_TABLE_TYPES = [
  "expense_cards_table",
  "accommodation_cards_table",
  "other_expenses_table",
];
const TRAVEL_TYPES = ["AIRWAYS", "TRAIN", "TAXI", "BUS", "OWN_CAR"];
const LODGING_TYPES = ["LODGING", "GUEST_HOUSE"];

// ─── Table style helpers ──────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  padding: "0.6rem 0.8rem",
  textAlign: "left",
  fontWeight: "700",
  fontSize: "0.77rem",
  color: "#166534",
  borderBottom: "2px solid #bbf7d0",
  whiteSpace: "nowrap",
  background: "#f0fdf4",
};
const TD: React.CSSProperties = {
  padding: "0.6rem 0.8rem",
  fontSize: "0.84rem",
  color: "#374151",
  verticalAlign: "middle",
  borderBottom: "1px solid #f3f4f6",
};

// ─── Component ────────────────────────────────────────────────────────────────

export const FormInterface: React.FC<FormInterfaceProps> = ({
  tripId,
  formId,
  trip,
  onSubmit,
  onBack,
  submissionData,
}) => {
  const { data: session } = useSession();

  // Form core state
  const [form, setForm] = useState<FormTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // Expense-linking state
  const [userTrips, setUserTrips] = useState<TripBasic[]>([]);
  const [activeExpenseTripId, setActiveExpenseTripId] = useState<string>(tripId || "");
  const [tripExpenses, setTripExpenses] = useState<FullExpense[]>([]);
  const [expenseSelections, setExpenseSelections] = useState<Record<string, string[]>>({});
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  // Profile auto-fill
  const [userProfile, setUserProfile] = useState<Record<string, any>>({});
  const [autoFilled, setAutoFilled] = useState(false);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const formHasExpenseTables = (f: FormTemplate | null): boolean => {
    if (!f?.templateSchema?.sections) return false;
    return f.templateSchema.sections.some((s: any) =>
      s.fields?.some((field: any) => EXPENSE_TABLE_TYPES.includes(field.type))
    );
  };

  // ─── Fetch form ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (submissionData) {
      // Read-only mode
      let template = { ...submissionData.template };
      if (template && typeof template.templateSchema === "string") {
        try { template.templateSchema = JSON.parse(template.templateSchema); }
        catch (e) { console.error("Failed to parse templateSchema:", e); }
      }
      setForm(template);
      if (submissionData.formData) {
        try {
          const parsed = JSON.parse(submissionData.formData);
          setFormData(parsed);
          if (parsed._expenseSelections) setExpenseSelections(parsed._expenseSelections);
        } catch (e) { console.error(e); }
      }
      setActiveExpenseTripId(submissionData.tripId);
      // Fetch trip expenses for this specific trip
      fetchTripExpenses(submissionData.tripId);
      setLoading(false);
      return;
    }
    fetchForm();
  }, [formId, submissionData]);

  const fetchForm = async () => {
    // ── Serve cached form immediately ───────────────────────────────────
    try {
      const cached = await getCachedForm(formId);
      if (cached) {
        let template = { ...cached };
        if (template.templateSchema && typeof template.templateSchema === "string") {
          try { template.templateSchema = JSON.parse(template.templateSchema); } catch (_) {}
        }
        setForm(template);
        const init: Record<string, any> = {};
        template?.templateSchema?.sections?.forEach((s: any) =>
          s.fields?.forEach((f: any) => { init[f.id] = ""; })
        );
        setFormData(init);
        setLoading(false);
      }
    } catch (_) {}

    // ── Then fetch fresh from network ──────────────────────────────────
    try {
      const res = await fetch(`/api/forms/${formId}`);
      if (!res.ok) throw new Error("Failed to fetch form");
      const data = await res.json();
      if (data.form && typeof data.form.templateSchema === "string") {
        try { data.form.templateSchema = JSON.parse(data.form.templateSchema); }
        catch (e) { console.error("Failed to parse templateSchema:", e); }
      }
      setForm(data.form);
      // Cache it
      cacheForms([data.form]).catch(() => {});
      // Init empty formData keys
      const init: Record<string, any> = {};
      data.form?.templateSchema?.sections?.forEach((s: any) =>
        s.fields?.forEach((f: any) => { init[f.id] = ""; })
      );
      setFormData(init);
      setError(null);
    } catch (err) {
      // Only show error if we truly have no form to display
      if (!form) setError("Failed to load form. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─── After form loads: fetch profile + trips if needed ─────────────────────

  useEffect(() => {
    if (!form || submissionData) return;
    fetchUserProfile();
    if (formHasExpenseTables(form)) {
      if (tripId) {
        setActiveExpenseTripId(tripId);
      } else {
        fetchUserTrips();
      }
    }
  }, [form]);

  // ─── When trip selected → fetch its expenses ───────────────────────────────

  useEffect(() => {
    if (activeExpenseTripId) fetchTripExpenses(activeExpenseTripId);
  }, [activeExpenseTripId]);

  // ─── Auto-fill form from profile ───────────────────────────────────────────

  useEffect(() => {
    if (!userProfile || !form?.templateSchema?.sections || autoFilled) return;
    const map: Record<string, string> = {
      "name":                              userProfile.name  || session?.user?.name || "",
      "emp. code":                         userProfile.empCode      || "",
      "employee code":                     userProfile.empCode      || "",
      "emp code":                          userProfile.empCode      || "",
      "pay level":                         userProfile.gradeLvl     || "",
      "grade level":                       userProfile.gradeLvl     || "",
      "designation":                       userProfile.designation  || "",
      "department":                        userProfile.department   || "",
      "bank account no. (sbi/any other)":  userProfile.bankAccount  || "",
      "bank account no.":                  userProfile.bankAccount  || "",
      "bank account":                      userProfile.bankAccount  || "",
      "ifsc code":                         userProfile.ifscCode     || "",
    };
    const fills: Record<string, string> = {};
    form.templateSchema.sections.forEach((s: any) => {
      s.fields?.forEach((f: any) => {
        const key = (f.label || "").toLowerCase().trim();
        if (map[key] && map[key] !== "") fills[f.id] = map[key];
      });
    });
    if (Object.keys(fills).length > 0) {
      setFormData(prev => ({ ...prev, ...fills }));
      setAutoFilled(true);
    }
  }, [userProfile, form]);

  // ─── API helpers ───────────────────────────────────────────────────────────

  const fetchUserTrips = async () => {
    setLoadingTrips(true);
    try {
      const res = await fetch("/api/trips");
      if (res.ok) { const d = await res.json(); setUserTrips(d.trips || []); }
    } catch (e) { console.error(e); }
    finally { setLoadingTrips(false); }
  };

  const fetchTripExpenses = async (id: string) => {
    setLoadingExpenses(true);

    // ── Serve cached expenses immediately ───────────────────────────────
    try {
      const cached = await getCachedExpensesByTrip(id);
      if (cached.length > 0) {
        setTripExpenses(cached.map((e: any) => ({
          ...e,
          metadata: (() => {
            try {
              let p = typeof e.metadata === "string" ? JSON.parse(e.metadata) : (e.metadata || {});
              if (typeof p === "string") p = JSON.parse(p);
              return typeof p === "object" && p !== null ? p : {};
            } catch { return {}; }
          })(),
        })) as FullExpense[]);
        setLoadingExpenses(false);
      }
    } catch (_) {}

    // ── Refresh from network ──────────────────────────────────────────
    try {
      const res = await fetch(`/api/trips/${id}`);
      if (res.ok) {
        const d = await res.json();
        const rawExpenses = d.trip?.expenses || d.expenses || [];
        const exps: FullExpense[] = rawExpenses.map((e: any) => ({
          ...e,
          metadata: (() => {
            try {
              let parsed = typeof e.metadata === "string" ? JSON.parse(e.metadata) : (e.metadata || {});
              if (typeof parsed === "string") parsed = JSON.parse(parsed);
              return typeof parsed === "object" && parsed !== null ? parsed : {};
            }
            catch { return {}; }
          })(),
        }));
        setTripExpenses(exps);
        // Cache them
        cacheExpenses(exps.map((e) => ({ ...e, tripId: id }))).catch(() => {});
      }
    } catch (e) { console.error(e); }
    finally { setLoadingExpenses(false); }
  };

  const fetchUserProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) { const d = await res.json(); setUserProfile(d.user || d || {}); }
    } catch (_) {}
  };

  // ─── Expense selection toggle ──────────────────────────────────────────────

  const toggleExpense = (fieldId: string, expenseId: string) => {
    if (submissionData && submissionData.status !== "DRAFT") return;
    setExpenseSelections(prev => {
      const cur = prev[fieldId] || [];
      return {
        ...prev,
        [fieldId]: cur.includes(expenseId)
          ? cur.filter(id => id !== expenseId)
          : [...cur, expenseId],
      };
    });
  };

  // ─── General field change ──────────────────────────────────────────────────

  const handleFieldChange = (fieldId: string, value: any) => {
    if (submissionData && submissionData.status !== "DRAFT") return;
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  // ─── Validate ──────────────────────────────────────────────────────────────

  const validateForm = (): boolean => {
    if (!form) return false;
    const sections = form.templateSchema?.sections || [{ fields: form.fields || [] }];
    for (const section of sections) {
      for (const field of section.fields || []) {
        if (!field.required) continue;
        if (field.type === "signature_authority") continue; // Manager fills this
        if (EXPENSE_TABLE_TYPES.includes(field.type)) {
          if ((expenseSelections[field.id] || []).length === 0) {
            setError(`"${field.label}" requires at least one selected expense`);
            return false;
          }
        } else if (field.type !== "staticText" && !formData[field.id]) {
          setError(`"${field.label}" is required`);
          return false;
        }
      }
    }
    setError(null);
    return true;
  };

  // ─── PDF generation ────────────────────────────────────────────────────────

  const generatePDF = async () => {
    if (!formRef.current || !form) return;
    try {
      const canvas = await html2canvas(formRef.current, { scale: 2, logging: false, backgroundColor: "#ffffff" });
      const imgW = 210;
      const imgH = (canvas.height * imgW) / canvas.width;
      const pdf = new jsPDF("p", "mm", "a4");
      let left = imgH, pos = 0;
      const img = canvas.toDataURL("image/png");
      while (left >= 0) {
        pdf.addImage(img, "PNG", 0, pos, imgW, imgH);
        left -= 297; pos -= 297;
        if (left > 0) pdf.addPage();
      }
      pdf.save(`${form.title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) { setError("Failed to generate PDF"); }
  };

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const finalTripId = activeExpenseTripId || tripId || undefined;
      const isDraftUpdate = submissionData && submissionData.status === "DRAFT";
      const url = isDraftUpdate ? `/api/submissions/${submissionData.id}` : "/api/submissions";
      const method = isDraftUpdate ? "PATCH" : "POST";
      
      const subRes = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: formId,
          tripId: finalTripId,
          status: "SUBMITTED",
          submissionDate: new Date(),
          formData,
          expenseSelections,
        }),
      });
      if (!subRes.ok) throw new Error("Failed to create submission");
      const sub = await subRes.json();

      // Upload PDF snapshot
      if (formRef.current && form) {
        const canvas = await html2canvas(formRef.current, { scale: 2, backgroundColor: "#ffffff" });
        const imgW = 210, imgH = (canvas.height * imgW) / canvas.width;
        const pdf = new jsPDF("p", "mm", "a4");
        let left = imgH, pos = 0;
        const img = canvas.toDataURL("image/png");
        while (left >= 0) { pdf.addImage(img, "PNG", 0, pos, imgW, imgH); left -= 297; pos -= 297; if (left > 0) pdf.addPage(); }
        const blob = pdf.output("blob");
        const fd = new FormData();
        fd.append("file", blob, `${form.title}_${Date.now()}.pdf`);
        await fetch(`/api/submissions/${sub.submission.id}/files`, { method: "POST", body: fd });
      }

      setSuccess(true);
      // Cache the submission locally
      cacheSingleSubmission(sub.submission).catch(() => {});
      if (onSubmit) onSubmit(sub.submission);
      setTimeout(() => { if (onBack) onBack(); }, 2000);
    } catch (err) {
      setError("Failed to submit form. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!form) return;
    setSubmitting(true);
    try {
      const finalTripId = activeExpenseTripId || tripId || undefined;
      const isDraftUpdate = submissionData && submissionData.status === "DRAFT";
      const url = isDraftUpdate ? `/api/submissions/${submissionData.id}` : "/api/submissions";
      const method = isDraftUpdate ? "PATCH" : "POST";

      const subRes = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: formId,
          tripId: finalTripId,
          status: "DRAFT",
          submissionDate: new Date(),
          formData,
          expenseSelections,
        }),
      });
      if (!subRes.ok) throw new Error("Failed to create draft");
      const sub = await subRes.json();

      setSuccess(true);
      alert("Draft saved successfully! You can find it in the My Reimbursements tab.");
      if (onSubmit) onSubmit(sub.submission);
      setTimeout(() => { if (onBack) onBack(); }, 2000);
    } catch (err) {
      setError("Failed to save draft. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Trip selector banner ──────────────────────────────────────────────────

  const renderTripSelector = () => {
    if (!form || !formHasExpenseTables(form)) return null;
    if (submissionData && submissionData.status !== "DRAFT") return null; // Don't show trip selection banner in read-only mode, tables handle it
    
    const linkedTitle =
      userTrips.find(t => t.id === activeExpenseTripId)?.title ||
      trip?.title ||
      null;

    return (
      <div style={{
        background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
        border: "1.5px solid #86efac",
        borderRadius: "1rem",
        padding: "1.25rem 1.5rem",
        marginBottom: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.6rem" }}>✈️</span>
          <div>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "800", color: "#166534" }}>
              Link Trip Expenses
            </h3>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "#4ade80" }}>
              Choose a trip to import your saved expense cards into the table fields below
            </p>
          </div>
        </div>

        {tripId ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#166534", fontWeight: "700", fontSize: "0.9rem" }}>
            <CheckCircle size={16} />
            Using expenses from trip: <strong>{trip?.title || tripId}</strong>
            {loadingExpenses && <span style={{ color: "#6b7280", fontWeight: "400", marginLeft: "0.5rem" }}>⏳ Loading expenses…</span>}
          </div>
        ) : loadingTrips ? (
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>⏳ Loading your trips…</p>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <select
              value={activeExpenseTripId}
              onChange={e => setActiveExpenseTripId(e.target.value)}
              style={{
                flex: "1 1 280px",
                maxWidth: "420px",
                padding: "0.7rem 1rem",
                border: "1.5px solid #86efac",
                borderRadius: "0.6rem",
                fontSize: "0.95rem",
                background: "white",
                color: "#1f2937",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              <option value="">— Select a Trip —</option>
              {userTrips.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            {activeExpenseTripId && (
              <span style={{ color: "#166534", fontWeight: "700", fontSize: "0.875rem" }}>
                {loadingExpenses
                  ? "⏳ Loading expenses…"
                  : `✓ ${tripExpenses.length} expense(s) loaded`}
              </span>
            )}
          </div>
        )}

        {linkedTitle && !loadingExpenses && tripExpenses.length > 0 && (
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", fontSize: "0.8rem", color: "#4b7a6a", marginTop: "0.25rem" }}>
            <span>✈️ Travel: <strong>{tripExpenses.filter(e => e.category === "Travel" || TRAVEL_TYPES.includes(e.expenseType)).length}</strong></span>
            <span>🏨 Lodging: <strong>{tripExpenses.filter(e => e.category === "Accommodation" || LODGING_TYPES.includes(e.expenseType)).length}</strong></span>
            <span>🧾 Other: <strong>{tripExpenses.filter(e => (e.category !== "Travel" && !TRAVEL_TYPES.includes(e.expenseType)) && (e.category !== "Accommodation" && !LODGING_TYPES.includes(e.expenseType))).length}</strong></span>
          </div>
        )}
      </div>
    );
  };

  // ─── Expense table: Travel (Section 12) ───────────────────────────────────

  const renderTravelTable = (field: any) => {
    const expenses = tripExpenses.filter(e => e.category === "Travel" || TRAVEL_TYPES.includes(e.expenseType));
    const selected = expenseSelections[field.id] || [];
    const total = expenses.filter(e => selected.includes(e.id)).reduce((s, e) => s + e.amount, 0);

    if (!activeExpenseTripId) return <NoTripWarning />;
    if (loadingExpenses) return <LoadingRow />;

    return (
      <div style={{ overflowX: "auto", marginTop: "0.5rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #d1fae5", borderRadius: "0.5rem", overflow: "hidden", minWidth: "950px" }}>
          <thead>
            <tr>
              {["", "Date", "Dep. Time", "From", "Arr. Date", "Arr. Time", "To", "Dist. (km)", "Class", "Ticket / PNR No.", "Fare (₹)"].map((h, i) => (
                <th key={i} style={{ ...TH, textAlign: i >= 10 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ padding: "1.5rem", textAlign: "center", color: "#9ca3af", fontStyle: "italic", fontSize: "0.85rem" }}>
                  No travel expenses (Air / Train / Taxi / Bus / Own Car) in this trip.{" "}
                  <span style={{ display: "block", marginTop: "0.25rem" }}>Add them from the ✈️ Trips tab first.</span>
                </td>
              </tr>
            ) : expenses.map(exp => {
              const on = selected.includes(exp.id);
              return (
                <tr
                  key={exp.id}
                  onClick={() => toggleExpense(field.id, exp.id)}
                  style={{ background: on ? "#f0fdf4" : "white", cursor: "pointer", transition: "background 0.12s" }}
                  onMouseEnter={e => { if (!on) e.currentTarget.style.background = "#fafafa"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = on ? "#f0fdf4" : "white"; }}
                >
                  <td style={{ ...TD, width: "36px" }}>
                    <input type="checkbox" checked={on} onChange={() => {}} style={{ cursor: "pointer", accentColor: "#16a34a", width: "16px", height: "16px" }} />
                  </td>
                  <td style={TD}>{new Date(exp.paymentDate).toLocaleDateString("en-IN")}</td>
                  <td style={TD}>{exp.metadata?.departureTime || "—"}</td>
                  <td style={TD}>{exp.metadata?.from || "—"}</td>
                  <td style={TD}>{exp.metadata?.arrivalDate ? new Date(exp.metadata.arrivalDate).toLocaleDateString("en-IN") : "—"}</td>
                  <td style={TD}>{exp.metadata?.arrivalTime || "—"}</td>
                  <td style={TD}>{exp.metadata?.to || "—"}</td>
                  <td style={{ ...TD, textAlign: "right" }}>{exp.metadata?.distance || "—"}</td>
                  <td style={TD}>{exp.metadata?.class || "—"}</td>
                  <td style={TD}>{exp.metadata?.pnr || "—"}</td>
                  <td style={{ ...TD, textAlign: "right", fontWeight: "700", color: "#1b5e3f" }}>
                    ₹{exp.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {selected.length > 0 && (
            <tfoot>
              <tr style={{ background: "#dcfce7" }}>
                <td colSpan={10} style={{ padding: "0.7rem 0.8rem", textAlign: "right", fontWeight: "700", color: "#166534", fontSize: "0.85rem" }}>
                  Total ({selected.length} selected):
                </td>
                <td style={{ padding: "0.7rem 0.8rem", textAlign: "right", fontWeight: "800", color: "#1b5e3f", fontSize: "0.95rem" }}>
                  ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  };

  // ─── Expense table: Accommodation (Section 13) ────────────────────────────

  const renderAccommodationTable = (field: any) => {
    const expenses = tripExpenses.filter(e => e.category === "Accommodation" || LODGING_TYPES.includes(e.expenseType));
    const selected = expenseSelections[field.id] || [];
    const total = expenses.filter(e => selected.includes(e.id)).reduce((s, e) => s + e.amount, 0);

    if (!activeExpenseTripId) return <NoTripWarning />;
    if (loadingExpenses) return <LoadingRow />;

    return (
      <div style={{ overflowX: "auto", marginTop: "0.5rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #d1fae5", borderRadius: "0.5rem", overflow: "hidden", minWidth: "560px" }}>
          <thead>
            <tr>
              {["", "Check-in", "Check-out", "Hotel / Guest House", "Bill No.", "Days", "Amount (₹)"].map((h, i) => (
                <th key={i} style={{ ...TH, textAlign: i >= 5 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "1.5rem", textAlign: "center", color: "#9ca3af", fontStyle: "italic", fontSize: "0.85rem" }}>
                  No lodging/accommodation expenses in this trip.{" "}
                  <span style={{ display: "block", marginTop: "0.25rem" }}>Add them from the ✈️ Trips tab first.</span>
                </td>
              </tr>
            ) : expenses.map(exp => {
              const on = selected.includes(exp.id);
              return (
                <tr
                  key={exp.id}
                  onClick={() => toggleExpense(field.id, exp.id)}
                  style={{ background: on ? "#f0fdf4" : "white", cursor: "pointer", transition: "background 0.12s" }}
                  onMouseEnter={e => { if (!on) e.currentTarget.style.background = "#fafafa"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = on ? "#f0fdf4" : "white"; }}
                >
                  <td style={{ ...TD, width: "36px" }}>
                    <input type="checkbox" checked={on} onChange={() => {}} style={{ cursor: "pointer", accentColor: "#16a34a", width: "16px", height: "16px" }} />
                  </td>
                  <td style={TD}>{exp.metadata?.from || new Date(exp.paymentDate).toLocaleDateString("en-IN")}</td>
                  <td style={TD}>{exp.metadata?.to || "—"}</td>
                  <td style={TD}>{exp.metadata?.hotelName || exp.metadata?.guestHouseName || exp.title}</td>
                  <td style={TD}>{exp.metadata?.billNo || "—"}</td>
                  <td style={{ ...TD, textAlign: "right" }}>{exp.metadata?.numNights ?? "—"}</td>
                  <td style={{ ...TD, textAlign: "right", fontWeight: "700", color: "#1b5e3f" }}>
                    ₹{exp.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {selected.length > 0 && (
            <tfoot>
              <tr style={{ background: "#dcfce7" }}>
                <td colSpan={6} style={{ padding: "0.7rem 0.8rem", textAlign: "right", fontWeight: "700", color: "#166534", fontSize: "0.85rem" }}>
                  Total ({selected.length} selected):
                </td>
                <td style={{ padding: "0.7rem 0.8rem", textAlign: "right", fontWeight: "800", color: "#1b5e3f", fontSize: "0.95rem" }}>
                  ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  };

  // ─── Expense table: Other (Section 15) ────────────────────────────────────

  const renderOtherExpensesTable = (field: any) => {
    const expenses = tripExpenses.filter(
      e => (e.category !== "Travel" && !TRAVEL_TYPES.includes(e.expenseType)) && (e.category !== "Accommodation" && !LODGING_TYPES.includes(e.expenseType))
    );
    const selected = expenseSelections[field.id] || [];
    const total = expenses.filter(e => selected.includes(e.id)).reduce((s, e) => s + e.amount, 0);

    if (!activeExpenseTripId) return <NoTripWarning />;
    if (loadingExpenses) return <LoadingRow />;

    return (
      <div style={{ overflowX: "auto", marginTop: "0.5rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #d1fae5", borderRadius: "0.5rem", overflow: "hidden" }}>
          <thead>
            <tr>
              {["", "Sr. No.", "Details", "Type", "Amount (₹)"].map((h, i) => (
                <th key={i} style={{ ...TH, textAlign: i >= 4 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "1.5rem", textAlign: "center", color: "#9ca3af", fontStyle: "italic", fontSize: "0.85rem" }}>
                  No other expenses (Registration / Visa / Food / Other) in this trip.{" "}
                  <span style={{ display: "block", marginTop: "0.25rem" }}>Add them from the ✈️ Trips tab first.</span>
                </td>
              </tr>
            ) : expenses.map((exp, idx) => {
              const on = selected.includes(exp.id);
              return (
                <tr
                  key={exp.id}
                  onClick={() => toggleExpense(field.id, exp.id)}
                  style={{ background: on ? "#f0fdf4" : "white", cursor: "pointer", transition: "background 0.12s" }}
                  onMouseEnter={e => { if (!on) e.currentTarget.style.background = "#fafafa"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = on ? "#f0fdf4" : "white"; }}
                >
                  <td style={{ ...TD, width: "36px" }}>
                    <input type="checkbox" checked={on} onChange={() => {}} style={{ cursor: "pointer", accentColor: "#16a34a", width: "16px", height: "16px" }} />
                  </td>
                  <td style={{ ...TD, textAlign: "center", fontWeight: "600", color: "#6b7280" }}>{idx + 1}</td>
                  <td style={TD}>
                    <div style={{ fontWeight: "500" }}>{exp.title}</div>
                    {exp.vendor && <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{exp.vendor}</div>}
                  </td>
                  <td style={TD}>
                    <span style={{ padding: "0.2rem 0.5rem", background: "#f3e8ff", color: "#7c3aed", borderRadius: "0.25rem", fontSize: "0.72rem", fontWeight: "700" }}>
                      {exp.expenseType}
                    </span>
                  </td>
                  <td style={{ ...TD, textAlign: "right", fontWeight: "700", color: "#1b5e3f" }}>
                    ₹{exp.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {selected.length > 0 && (
            <tfoot>
              <tr style={{ background: "#dcfce7" }}>
                <td colSpan={4} style={{ padding: "0.7rem 0.8rem", textAlign: "right", fontWeight: "700", color: "#166534", fontSize: "0.85rem" }}>
                  Total ({selected.length} selected):
                </td>
                <td style={{ padding: "0.7rem 0.8rem", textAlign: "right", fontWeight: "800", color: "#1b5e3f", fontSize: "0.95rem" }}>
                  ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  };

  // ─── Render a single form field ────────────────────────────────────────────

  const renderField = (field: any) => {
    const isReadOnly = !!submissionData && submissionData.status !== "DRAFT";

    switch (field.type) {
      case "text":
      case "short_text":
      case "email":
      case "phone":
        return (
          <input
            type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
            value={formData[field.id] || ""}
            onChange={e => handleFieldChange(field.id, e.target.value)}
            disabled={isReadOnly}
            placeholder={isReadOnly ? "" : field.placeholder || `Enter ${field.label.toLowerCase()}`}
            style={{ ...inputStyle, background: isReadOnly ? "#fafafa" : "white" }}
          />
        );
      case "long_text":
        return (
          <textarea
            value={formData[field.id] || ""}
            onChange={e => handleFieldChange(field.id, e.target.value)}
            disabled={isReadOnly}
            placeholder={isReadOnly ? "" : field.placeholder || "Enter your response…"}
            style={{ ...inputStyle, minHeight: "100px", resize: "vertical", background: isReadOnly ? "#fafafa" : "white" }}
          />
        );
      case "number":
      case "decimal":
        return (
          <input
            type="number"
            value={formData[field.id] || ""}
            onChange={e => handleFieldChange(field.id, e.target.value)}
            disabled={isReadOnly}
            placeholder={isReadOnly ? "" : field.placeholder || "0"}
            style={{ ...inputStyle, background: isReadOnly ? "#fafafa" : "white" }}
          />
        );
      case "date":
        return <input disabled={isReadOnly} type="date" value={formData[field.id] || ""} onChange={e => handleFieldChange(field.id, e.target.value)} style={{ ...inputStyle, background: isReadOnly ? "#fafafa" : "white" }} />;
      case "time":
        return <input disabled={isReadOnly} type="time" value={formData[field.id] || ""} onChange={e => handleFieldChange(field.id, e.target.value)} style={{ ...inputStyle, background: isReadOnly ? "#fafafa" : "white" }} />;
      case "datetime":
        return <input disabled={isReadOnly} type="datetime-local" value={formData[field.id] || ""} onChange={e => handleFieldChange(field.id, e.target.value)} style={{ ...inputStyle, background: isReadOnly ? "#fafafa" : "white" }} />;
      case "multiple_choice":
      case "yesno":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {(field.options || (field.type === "yesno" ? ["Yes", "No"] : [])).map((opt: string) => (
              <label key={opt} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: isReadOnly ? "default" : "pointer", fontSize: "0.95rem" }}>
                <input disabled={isReadOnly} type="radio" name={field.id} value={opt} checked={formData[field.id] === opt} onChange={e => handleFieldChange(field.id, e.target.value)} style={{ accentColor: "#1b5e3f" }} />
                {opt}
              </label>
            ))}
          </div>
        );
      case "checkbox":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {(field.options || []).map((opt: string) => {
              const vals = Array.isArray(formData[field.id]) ? formData[field.id] : [];
              return (
                <label key={opt} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: isReadOnly ? "default" : "pointer", fontSize: "0.95rem" }}>
                  <input
                    disabled={isReadOnly}
                    type="checkbox"
                    checked={vals.includes(opt)}
                    onChange={e => handleFieldChange(field.id, e.target.checked ? [...vals, opt] : vals.filter((v: string) => v !== opt))}
                    style={{ accentColor: "#1b5e3f" }}
                  />
                  {opt}
                </label>
              );
            })}
          </div>
        );
      case "dropdown":
        return (
          <select disabled={isReadOnly} value={formData[field.id] || ""} onChange={e => handleFieldChange(field.id, e.target.value)} style={{ ...inputStyle, background: isReadOnly ? "#fafafa" : "white" }}>
            <option value="" disabled>Select an option</option>
            {(field.options || []).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        );
      case "linear_scale":
        return (
          <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem" }}>
            {field.minLabel && <span style={{ fontSize: "0.85rem", color: "#6b7280", paddingBottom: "0.25rem" }}>{field.minLabel}</span>}
            <div style={{ display: "flex", gap: "0.75rem", flex: 1, justifyContent: "space-between" }}>
              {Array.from({ length: (field.scaleEnd || 10) - (field.scaleStart || 1) + 1 }).map((_, idx) => {
                const val = (field.scaleStart || 1) + idx;
                return (
                  <label key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem", cursor: isReadOnly ? "default" : "pointer" }}>
                    <input disabled={isReadOnly} type="radio" name={field.id} value={val} checked={String(formData[field.id]) === String(val)} onChange={e => handleFieldChange(field.id, e.target.value)} style={{ accentColor: "#1b5e3f" }} />
                    <span style={{ fontSize: "0.78rem", fontWeight: "600" }}>{val}</span>
                  </label>
                );
              })}
            </div>
            {field.maxLabel && <span style={{ fontSize: "0.85rem", color: "#6b7280", paddingBottom: "0.25rem" }}>{field.maxLabel}</span>}
          </div>
        );
      case "rating":
        return (
          <div style={{ display: "flex", gap: "0.5rem", fontSize: "1.75rem" }}>
            {[1, 2, 3, 4, 5].map(n => (
              <span key={n} onClick={() => handleFieldChange(field.id, n)} style={{ cursor: isReadOnly ? "default" : "pointer", color: (formData[field.id] || 0) >= n ? "#f59e0b" : "#d1d5db" }}>★</span>
            ))}
          </div>
        );
      case "staticText":
        return (
          <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "0.5rem", color: "#475569", fontSize: "0.95rem", whiteSpace: "pre-wrap", border: "1px solid #e2e8f0" }}>
            {field.value || field.label}
          </div>
        );
      case "file_upload":
        return (
          <div style={{ border: "2px dashed #d1d5db", padding: "1.5rem", textAlign: "center", borderRadius: "0.5rem", color: "#6b7280", fontSize: "0.9rem" }}>
            📎 Click or drag file to upload
          </div>
        );
      // ─── Expense card tables ──────────────────────────────────────────
      case "expense_cards_table":
        return renderTravelTable(field);
      case "accommodation_cards_table":
        return renderAccommodationTable(field);
      case "other_expenses_table":
        return renderOtherExpensesTable(field);
      case "signature_authority":
        let isApproved = false;
        let isRejected = false;
        if (submissionData && submissionData.signatures) {
          try {
            const sigs = JSON.parse(submissionData.signatures);
            if (sigs[field.id] === true) isApproved = true;
            if (sigs[field.id] === false) isRejected = true;
          } catch(e) {}
        }
        return (
          <div style={{ marginTop: "1.5rem", display: "inline-flex", flexDirection: "column", alignItems: "center", minWidth: "220px", border: "1px dashed #cbd5e1", padding: "1.5rem 1rem 0.5rem", borderRadius: "0.5rem", position: "relative" }}>
            {isApproved && (
              <div style={{ position: "absolute", top: "-10px", right: "-10px", transform: "rotate(-10deg)", border: "3px solid #16a34a", color: "#16a34a", padding: "0.25rem 0.75rem", borderRadius: "0.25rem", fontWeight: "800", fontSize: "0.9rem", letterSpacing: "1px", textTransform: "uppercase", background: "rgba(255,255,255,0.9)" }}>
                APPROVED
              </div>
            )}
            {isRejected && (
               <div style={{ position: "absolute", top: "-10px", right: "-10px", transform: "rotate(-10deg)", border: "3px solid #dc2626", color: "#dc2626", padding: "0.25rem 0.75rem", borderRadius: "0.25rem", fontWeight: "800", fontSize: "0.9rem", letterSpacing: "1px", textTransform: "uppercase", background: "rgba(255,255,255,0.9)" }}>
                REJECTED
              </div>
            )}
            <div style={{ height: "40px", borderBottom: "1px solid #1e293b", width: "100%", marginBottom: "0.5rem" }}></div>
            <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "#334155" }}>
              Signature of {field.label || "Authority"}
            </div>
            {isApproved && (
               <div style={{ fontSize: "0.7rem", color: "#16a34a", marginTop: "0.25rem", fontWeight: "500" }}>
                 Digitally verified by Approver
               </div>
            )}
          </div>
        );
      default:
        return (
          <input disabled={isReadOnly} type="text" value={formData[field.id] || ""} onChange={e => handleFieldChange(field.id, e.target.value)} style={{...inputStyle, background: isReadOnly ? "#fafafa" : "white"}} />
        );
    }
  };

  // ─── Loading / Error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📋</div>
        <p style={{ color: "#6b7280" }}>Loading form…</p>
      </div>
    );
  }
  if (!form) {
    return (
      <div style={{ padding: "2rem", display: "flex", gap: "0.5rem", alignItems: "center", color: "#dc2626" }}>
        <AlertCircle size={20} /> <span>Form not found</span>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem" }}>

      {/* Header */}
      <div style={{ marginBottom: "2rem", display: "flex", alignItems: "flex-start", gap: "1rem" }}>
        {onBack && (
          <button onClick={onBack} style={{ background: "transparent", border: "1px solid #d1d5db", padding: "0.5rem 1rem", borderRadius: "0.5rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "500", flexShrink: 0 }}>
            <ChevronLeft size={18} /> Back
          </button>
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "800", margin: "0 0 0.25rem", color: "#1f2937" }}>{form.title}</h1>
          {form.description && <p style={{ color: "#6b7280", margin: 0, fontSize: "0.95rem" }}>{form.description}</p>}
        </div>
        <button
          onClick={generatePDF}
          style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem", background: "#6d28d9", color: "white", border: "none", borderRadius: "0.5rem", fontWeight: "600", cursor: "pointer", fontSize: "0.85rem", flexShrink: 0, whiteSpace: "nowrap" }}
        >
          <Download size={16} /> Download PDF
        </button>
      </div>

      {/* Auto-fill notice */}
      {autoFilled && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "0.75rem", padding: "0.75rem 1rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#1e40af" }}>
          ✨ <span>Profile data auto-filled where fields match — review and edit as needed.</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#dc2626", padding: "1rem", borderRadius: "0.75rem", marginBottom: "1.5rem", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
          <AlertCircle size={20} style={{ flexShrink: 0, marginTop: "0.1rem" }} />
          <span>{error}</span>
        </div>
      )}

      {/* Success */}
      {success && (
        <div style={{ background: "#dcfce7", border: "1px solid #86efac", color: "#16a34a", padding: "1rem", borderRadius: "0.75rem", marginBottom: "1.5rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <CheckCircle size={20} /> <span>Form submitted successfully! Redirecting…</span>
        </div>
      )}

      {/* Trip selector (shown when form has expense table fields) */}
      {renderTripSelector()}

      {/* Form body */}
      <div
        ref={formRef}
        style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "0.875rem", padding: "2rem", marginBottom: "2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
      >
        {(form.templateSchema?.sections || [{ id: "fallback", title: "", fields: form.fields || [] }]).map((section: any) => (
          <div key={section.id} style={{ marginBottom: "2.5rem" }}>
            {section.title && (
              <div style={{ marginBottom: "1.5rem", paddingBottom: "0.65rem", borderBottom: "2px solid #f0fdf4" }}>
                <h2 style={{ fontSize: "1.05rem", fontWeight: "800", color: "#1b5e3f", margin: "0 0 0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {section.title}
                </h2>
                {section.description && <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0 }}>{section.description}</p>}
              </div>
            )}

            {section.fields?.map((field: any) => (
              <div key={field.id} style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.35rem", color: "#334155" }}>
                  {field.label}
                  {field.required && <span style={{ color: "#dc2626" }}> *</span>}
                </label>
                {field.description && (
                  <p style={{ fontSize: "0.82rem", color: "#6b7280", margin: "0 0 0.4rem" }}>{field.description}</p>
                )}
                {field.helpText && (
                  <p style={{ fontSize: "0.78rem", color: "#9ca3af", margin: "0 0 0.4rem", fontStyle: "italic" }}>{field.helpText}</p>
                )}
                {renderField(field)}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
        {(!submissionData || submissionData.status === "DRAFT") && (
          <>
            <button
              onClick={handleSaveDraft}
              disabled={submitting}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 2rem", background: "white", color: "#1b5e3f", border: "2px solid #1b5e3f", borderRadius: "0.75rem", fontWeight: "700", cursor: submitting ? "not-allowed" : "pointer", fontSize: "0.9rem", opacity: submitting ? 0.7 : 1 }}
            >
              Save as Draft
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 2rem", background: "linear-gradient(135deg, #1b5e3f, #2d8a5e)", color: "white", border: "none", borderRadius: "0.75rem", fontWeight: "700", cursor: submitting ? "not-allowed" : "pointer", fontSize: "0.9rem", opacity: submitting ? 0.7 : 1, boxShadow: "0 4px 12px rgba(27,94,63,0.25)" }}
            >
              <Send size={18} /> {submitting ? "Submitting…" : "Submit Form"}
            </button>
          </>
        )}
        <button
          onClick={generatePDF}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "transparent", border: "2px solid #6d28d9", color: "#6d28d9", borderRadius: "0.75rem", fontWeight: "700", cursor: "pointer", fontSize: "0.9rem" }}
        >
          <Download size={18} /> Download PDF
        </button>
      </div>
    </div>
  );
};

// ─── Small helper sub-components ──────────────────────────────────────────────

const NoTripWarning = () => (
  <div style={{ padding: "1rem", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "0.5rem", color: "#92400e", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
    ⚠️ Please select a trip above to load your expense cards.
  </div>
);

const LoadingRow = () => (
  <div style={{ padding: "1.5rem", textAlign: "center", background: "#f9fafb", borderRadius: "0.5rem", color: "#6b7280", fontSize: "0.875rem" }}>
    ⏳ Loading expenses…
  </div>
);

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  minHeight: "42px",
  border: "1px solid #d1d5db",
  borderRadius: "0.5rem",
  fontSize: "0.95rem",
  fontFamily: "inherit",
  lineHeight: "1.4",
  boxSizing: "border-box",
  outline: "none",
  transition: "border-color 0.15s",
  color: "#1f2937",
};
