"use client";

import { useState, useEffect } from "react";
import { EXPENSE_TYPES } from "@/lib/expense-config";

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  expenseType: string;
  paymentDate: string;
}

interface FormField {
  id: string;
  type: "signature" | "yesno" | "date" | "text" | "expenseTable" | "number" | "staticText";
  label: string;
  required: boolean;
  position?: { x: number; y: number };
  width?: number;
  height?: number;
  properties?: Record<string, any>;
}

export const FormFiller = ({
  tripId,
  formId,
  trip,
}: {
  tripId: string;
  formId: string;
  trip: { id: string; title: string; expenses: Expense[] };
}) => {
  const [form, setForm] = useState<{ title: string; description: string; fields: FormField[] } | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForm();
  }, [formId]);

  const fetchForm = async () => {
    try {
      const res = await fetch(`/api/forms/${formId}`);
      if (res.ok) {
        const data = await res.json();
        setForm(data);
      }
    } catch (error) {
      console.error("Error fetching form:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData({ ...formData, [fieldId]: value });
  };

  const toggleExpense = (expenseId: string) => {
    const newSelected = new Set(selectedExpenses);
    if (newSelected.has(expenseId)) {
      newSelected.delete(expenseId);
    } else {
      newSelected.add(expenseId);
    }
    setSelectedExpenses(newSelected);
  };

  const handleSubmit = async () => {
    // Validate required fields
    const hasAllRequired = form?.fields.every((f) => {
      if (!f.required) return true;
      if (f.type === "expenseTable") return selectedExpenses.size > 0;
      return formData[f.id];
    });

    if (!hasAllRequired) {
      alert("Please fill all required fields");
      return;
    }

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: formId,
          tripId,
          formData,
          selectedExpenses: Array.from(selectedExpenses),
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        alert("Form submitted successfully!");
      } else {
        alert("Error submitting form");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const handleSaveDraft = async () => {
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: formId,
          tripId,
          formData,
          selectedExpenses: Array.from(selectedExpenses),
          status: "DRAFT"
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        alert("Form saved as draft successfully! You can view it in the 'My Reimbursements' tab.");
      } else {
        alert("Error saving draft");
      }
    } catch (error) {
      console.error("Error saving draft:", error);
    }
  };

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading form...</div>;
  }

  if (!form) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#ef4444" }}>Form not found</div>;
  }

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ background: "white", borderRadius: "0.75rem", padding: "2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <h1 style={{ margin: "0 0 0.5rem 0", color: "#1a3a2e", fontSize: "1.75rem", fontWeight: "700" }}>
          {form.title}
        </h1>
        <p style={{ margin: "0 0 2rem 0", color: "#5a6f6a", fontSize: "0.95rem" }}>
          {form.description}
        </p>

        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "2rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
          {form.fields.map((field) => {
            if (field.type === "expenseTable") {
              const selectedExpenseData = trip.expenses.filter((e) => selectedExpenses.has(e.id));
              const totalAmount = selectedExpenseData.reduce((sum, e) => sum + e.amount, 0);

              return (
                <div key={field.id}>
                  <label style={{ display: "block", fontSize: "0.95rem", fontWeight: "600", marginBottom: "1rem", color: "#1a3a2e" }}>
                    {field.label}
                    {field.required && <span style={{ color: "#ef4444" }}> *</span>}
                  </label>

                  <div style={{ borderRadius: "0.75rem", border: "1px solid #e5e7eb", overflow: "hidden", marginBottom: "1rem" }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "0.5fr 1fr 1fr 1fr",
                        gap: "1rem",
                        padding: "1rem",
                        background: "#f3f4f6",
                        fontWeight: "600",
                        fontSize: "0.85rem",
                      }}
                    >
                      <div>Select</div>
                      <div>Expense</div>
                      <div>Category</div>
                      <div>Amount</div>
                    </div>

                    {trip.expenses.length === 0 ? (
                      <div style={{ padding: "1rem", textAlign: "center", color: "#9ca3af" }}>
                        No expenses in this trip
                      </div>
                    ) : (
                      trip.expenses.map((expense) => (
                        <div
                          key={expense.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "0.5fr 1fr 1fr 1fr",
                            gap: "1rem",
                            padding: "1rem",
                            borderTop: "1px solid #e5e7eb",
                            alignItems: "center",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedExpenses.has(expense.id)}
                            onChange={() => toggleExpense(expense.id)}
                            style={{ cursor: "pointer" }}
                          />
                          <div style={{ fontSize: "0.9rem" }}>{expense.title}</div>
                          <div style={{ fontSize: "0.9rem", color: "#5a6f6a" }}>{expense.category}</div>
                          <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "#1b5e3f" }}>
                            ₹{expense.amount.toFixed(2)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {selectedExpenseData.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "1rem",
                        background: "#f0f9f7",
                        borderRadius: "0.5rem",
                        fontSize: "0.95rem",
                        fontWeight: "600",
                      }}
                    >
                      <span>Total Selected ({selectedExpenseData.length} expenses):</span>
                      <span style={{ color: "#1b5e3f" }}>₹{totalAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              );
            }

            if (field.type === "signature") {
              return (
                <div key={field.id}>
                  <label style={{ display: "block", fontSize: "0.95rem", fontWeight: "600", marginBottom: "0.75rem", color: "#1a3a2e" }}>
                    {field.label}
                    {field.required && <span style={{ color: "#ef4444" }}> *</span>}
                  </label>
                  <div
                    style={{
                      minHeight: "100px",
                      border: "2px dashed #d1d5db",
                      borderRadius: "0.5rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#9ca3af",
                      fontSize: "0.9rem",
                    }}
                  >
                    [Signature Space - Upload signature image]
                  </div>
                </div>
              );
            }

            if (field.type === "yesno") {
              return (
                <div key={field.id}>
                  <label style={{ display: "block", fontSize: "0.95rem", fontWeight: "600", marginBottom: "0.75rem", color: "#1a3a2e" }}>
                    {field.label}
                    {field.required && <span style={{ color: "#ef4444" }}> *</span>}
                  </label>
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name={field.id}
                        value="yes"
                        checked={formData[field.id] === "yes"}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      />
                      Yes
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name={field.id}
                        value="no"
                        checked={formData[field.id] === "no"}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      />
                      No
                    </label>
                  </div>
                </div>
              );
            }

            if (field.type === "date") {
              return (
                <div key={field.id}>
                  <label style={{ display: "block", fontSize: "0.95rem", fontWeight: "600", marginBottom: "0.5rem", color: "#1a3a2e" }}>
                    {field.label}
                    {field.required && <span style={{ color: "#ef4444" }}> *</span>}
                  </label>
                  <input
                    type="date"
                    value={formData[field.id] || ""}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.5rem",
                      fontSize: "0.95rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              );
            }

            if (field.type === "number") {
              return (
                <div key={field.id}>
                  <label style={{ display: "block", fontSize: "0.95rem", fontWeight: "600", marginBottom: "0.5rem", color: "#1a3a2e" }}>
                    {field.label}
                    {field.required && <span style={{ color: "#ef4444" }}> *</span>}
                  </label>
                  <input
                    type="number"
                    value={formData[field.id] || ""}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.5rem",
                      fontSize: "0.95rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              );
            }

            // Text field (default)
            return (
              <div key={field.id}>
                <label style={{ display: "block", fontSize: "0.95rem", fontWeight: "600", marginBottom: "0.5rem", color: "#1a3a2e" }}>
                  {field.label}
                  {field.required && <span style={{ color: "#ef4444" }}> *</span>}
                </label>
                <input
                  type="text"
                  value={formData[field.id] || ""}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    fontSize: "0.95rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
          <button
            onClick={handleSubmit}
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
            Submit Form
          </button>
          <button
            onClick={handleSaveDraft}
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
            Save as Draft
          </button>
        </div>
      </div>
    </div>
  );
};
