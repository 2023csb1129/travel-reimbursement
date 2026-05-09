"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Upload, X, FileCheck, AlertCircle } from "lucide-react";

interface ExpenseFormProps {
  tripId: string;
  onSuccess?: (expense: any) => void;
  onCancel?: () => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ tripId, onSuccess, onCancel }) => {
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [paymentCards, setPaymentCards] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/profile/payment-cards")
      .then(res => res.json())
      .then(data => {
        if (data.cards) setPaymentCards(data.cards);
      })
      .catch(console.error);
  }, []);

  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    category: "Travel",
    expenseType: "Air",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "Cash",
    vendor: "",
    billNumber: "",
    description: "",
    metadata: {} as Record<string, string>,
  });

  const expenseTypes: Record<string, string[]> = {
    Travel: ["Air", "Train", "Bus", "Taxi", "Petrol"],
    Accommodation: ["Hotel", "Guest House", "Homestay"],
    Food: ["Meals", "Snacks", "Beverages"],
    Other: ["Supplies", "Services", "Miscellaneous"],
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleMetadataChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, [key]: value },
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
      if (!validTypes.includes(file.type)) {
        setError(`File type not supported: ${file.name}`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(`File too large: ${file.name} (max 5MB)`);
        return false;
      }
      return true;
    });
    setUploadedFiles((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.title.trim()) {
      setError("Expense title is required");
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (uploadedFiles.length === 0) {
      setError("Please upload at least one bill/receipt");
      return;
    }

    setLoading(true);
    try {
      // Create expense
      const expenseRes = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId,
          title: formData.title,
          amount: parseFloat(formData.amount),
          category: formData.category,
          expenseType: formData.expenseType,
          paymentDate: formData.paymentDate,
          paymentMethod: formData.paymentMethod,
          vendor: formData.vendor,
          billNumber: formData.billNumber,
          description: formData.description,
          status: "DRAFT",
          metadata: formData.metadata,
        }),
      });

      if (!expenseRes.ok) throw new Error("Failed to create expense");
      const expense = await expenseRes.json();

      // Upload bill files
      for (const file of uploadedFiles) {
        const formDataFile = new FormData();
        formDataFile.append("file", file);

        await fetch(`/api/expenses/${expense.expense.id}/bills`, {
          method: "POST",
          body: formDataFile,
        });
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.(expense.expense);
      }, 1500);
    } catch (err) {
      setError((err as Error).message || "Failed to save expense");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "3rem 2rem",
          background: "white",
          borderRadius: "0.75rem",
          border: "1px solid #e5e7eb",
        }}
      >
        <FileCheck
          size={48}
          style={{ margin: "0 auto 1rem", color: "#10b981" }}
        />
        <h3 style={{ fontSize: "1.25rem", fontWeight: "700", margin: "0 0 0.5rem" }}>
          Expense Saved!
        </h3>
        <p style={{ color: "var(--text-muted)" }}>
          Your expense has been created successfully.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "white",
        borderRadius: "0.75rem",
        border: "1px solid #e5e7eb",
        padding: "2rem",
        maxWidth: "700px",
      }}
    >
      <h2 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "1.5rem" }}>
        Add New Expense
      </h2>

      {error && (
        <div
          style={{
            background: "#fee2e2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            padding: "1rem",
            borderRadius: "0.5rem",
            marginBottom: "1.5rem",
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      {/* Title and Amount */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
            Expense Title *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => handleFieldChange("title", e.target.value)}
            placeholder="e.g., Flight to Delhi"
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
            Amount (₹) *
          </label>
          <input
            type="number"
            required
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={(e) => handleFieldChange("amount", e.target.value)}
            placeholder="0.00"
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

      {/* Category and Type */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
            Category
          </label>
          <select
            value={formData.category}
            onChange={(e) => {
              handleFieldChange("category", e.target.value);
              handleFieldChange("expenseType", "");
            }}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.5rem",
              fontSize: "0.9rem",
              boxSizing: "border-box",
            }}
          >
            {Object.keys(expenseTypes).map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
            Type
          </label>
          <select
            value={formData.expenseType}
            onChange={(e) => handleFieldChange("expenseType", e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.5rem",
              fontSize: "0.9rem",
              boxSizing: "border-box",
            }}
          >
            <option value="">Select type</option>
            {expenseTypes[formData.category]?.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Date and Payment Method */}
      <div style={{ display: "grid", gridTemplateColumns: formData.paymentMethod === "Cards that are saved in profile" ? "1fr 1fr 1fr" : "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
            Payment Date
          </label>
          <input
            type="date"
            value={formData.paymentDate}
            onChange={(e) => handleFieldChange("paymentDate", e.target.value)}
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
            Mode of Payment
          </label>
          <select
            value={formData.paymentMethod}
            onChange={(e) => handleFieldChange("paymentMethod", e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.5rem",
              fontSize: "0.9rem",
              boxSizing: "border-box",
            }}
          >
            <option value="Cash">Cash</option>
            <option value="Cards that are saved in profile">Cards that are saved in profile</option>
            <option value="Other">Other</option>
          </select>
        </div>
        {formData.paymentMethod === "Cards that are saved in profile" && (
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              Select Card (Optional)
            </label>
            <select
              value={formData.metadata?.savedCardId || ""}
              onChange={(e) => handleMetadataChange("savedCardId", e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.5rem",
                fontSize: "0.9rem",
                boxSizing: "border-box",
              }}
            >
              <option value="">Select a card...</option>
              {paymentCards.map(card => (
                <option key={card.id} value={card.id}>
                  {card.label} ({card.maskedNumber})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Notes / Remarks */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
          Notes / Remarks (Bank Details, etc.)
        </label>
        <input
          type="text"
          value={formData.metadata?.remarks || ""}
          onChange={(e) => handleMetadataChange("remarks", e.target.value)}
          placeholder="e.g., Paid using HDFC Credit Card ending in 1234"
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

      {/* Vendor and Bill Number */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
            Vendor/Provider
          </label>
          <input
            type="text"
            value={formData.vendor}
            onChange={(e) => handleFieldChange("vendor", e.target.value)}
            placeholder="e.g., Air India"
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
            Bill/Invoice Number
          </label>
          <input
            type="text"
            value={formData.billNumber}
            onChange={(e) => handleFieldChange("billNumber", e.target.value)}
            placeholder="e.g., INV123456"
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

      {/* Description */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleFieldChange("description", e.target.value)}
          placeholder="Additional details about this expense..."
          rows={3}
          style={{
            width: "100%",
            padding: "0.75rem",
            border: "1px solid #d1d5db",
            borderRadius: "0.5rem",
            fontSize: "0.9rem",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />
      </div>

      {/* Dynamic Metadata Fields based on Category */}
      {formData.category === "Travel" && (
        <div style={{ background: "#f8fafc", padding: "1.5rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0", marginBottom: "1.5rem" }}>
          <h4 style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "1rem", color: "#1e293b" }}>Travel Booking Details</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>From (City)</label>
              <input type="text" value={formData.metadata?.from || ""} onChange={(e) => handleMetadataChange("from", e.target.value)} placeholder="e.g. Delhi" style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "0.5rem" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>To (City)</label>
              <input type="text" value={formData.metadata?.to || ""} onChange={(e) => handleMetadataChange("to", e.target.value)} placeholder="e.g. Mumbai" style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "0.5rem" }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>Travel Class</label>
              <input type="text" value={formData.metadata?.travelClass || ""} onChange={(e) => handleMetadataChange("travelClass", e.target.value)} placeholder="e.g. Economy / 2AC" style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "0.5rem" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>PNR / Ticket No.</label>
              <input type="text" value={formData.metadata?.pnr || ""} onChange={(e) => handleMetadataChange("pnr", e.target.value)} placeholder="e.g. XY123A" style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "0.5rem" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>Distance (km)</label>
              <input type="text" value={formData.metadata?.distance || ""} onChange={(e) => handleMetadataChange("distance", e.target.value)} placeholder="e.g. 1400" style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "0.5rem" }} />
            </div>
          </div>
        </div>
      )}

      {formData.category === "Accommodation" && (
        <div style={{ background: "#f8fafc", padding: "1.5rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0", marginBottom: "1.5rem" }}>
          <h4 style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "1rem", color: "#1e293b" }}>Accommodation Details</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>Check-in Date</label>
              <input type="date" value={formData.metadata?.checkIn || ""} onChange={(e) => handleMetadataChange("checkIn", e.target.value)} style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "0.5rem" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>Check-out Date</label>
              <input type="date" value={formData.metadata?.checkOut || ""} onChange={(e) => handleMetadataChange("checkOut", e.target.value)} style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "0.5rem" }} />
            </div>
          </div>
        </div>
      )}

      {/* File Upload */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
          Upload Bills/Receipts * (PDF, JPG, PNG)
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: "2px dashed #d1d5db",
            borderRadius: "0.5rem",
            padding: "2rem",
            textAlign: "center",
            cursor: "pointer",
            background: "#f9fafb",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "#6d28d9";
            (e.currentTarget as HTMLElement).style.background = "#f3f4f6";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db";
            (e.currentTarget as HTMLElement).style.background = "#f9fafb";
          }}
        >
          <Upload size={24} style={{ margin: "0 auto 0.5rem", color: "#6d28d9" }} />
          <p style={{ fontSize: "0.9rem", fontWeight: "600", margin: "0 0 0.25rem" }}>
            Click to upload or drag and drop
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
            PDF, JPG, PNG (Max 5MB)
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: "none" }}
          accept=".pdf,.jpg,.jpeg,.png"
        />
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
            {uploadedFiles.length} file{uploadedFiles.length !== 1 ? "s" : ""} selected
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {uploadedFiles.map((file, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem",
                  background: "#f9fafb",
                  borderRadius: "0.5rem",
                  border: "1px solid #e5e7eb",
                }}
              >
                <FileCheck size={18} style={{ color: "#10b981" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {file.name}
                  </p>
                  <p
                    style={{
                      margin: "0.25rem 0 0",
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#6b7280",
                    cursor: "pointer",
                    padding: "0.25rem",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
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
        )}
        <button
          type="submit"
          disabled={loading || success}
          style={{
            padding: "0.75rem 2rem",
            background: "var(--gradient-primary)",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "600",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Saving..." : "Save Expense"}
        </button>
      </div>
    </form>
  );
};
