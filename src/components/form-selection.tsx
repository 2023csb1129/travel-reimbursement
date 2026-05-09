"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, Search } from "lucide-react";

interface FormTemplate {
  id: string;
  title: string;
  description?: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface FormSelectionProps {
  tripId: string;
  onSelectForm: (formId: string, form: FormTemplate) => void;
  onCancel?: () => void;
}

export const FormSelection: React.FC<FormSelectionProps> = ({
  tripId,
  onSelectForm,
  onCancel,
}) => {
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const res = await fetch("/api/forms?active=true");
      if (res.ok) {
        const data = await res.json();
        setForms(data.forms || []);
        setError(null);
      } else {
        setError("Failed to load forms");
      }
    } catch (err) {
      console.error("Error fetching forms:", err);
      setError("Error loading forms");
    } finally {
      setLoading(false);
    }
  };

  const filteredForms = forms.filter((form) =>
    form.title.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📋</div>
        <p style={{ color: "var(--text-muted)" }}>Loading available forms...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "800", margin: "0 0 0.5rem" }}>
          Select a Form
        </h1>
        <p style={{ color: "var(--text-muted)", margin: 0 }}>
          Choose a form template to fill out for your trip
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: "2rem" }}>
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Search size={18} style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search forms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: "0.75rem 1rem",
              paddingLeft: "2.5rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.5rem",
              fontSize: "0.9rem",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: "#fee2e2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            padding: "1rem",
            borderRadius: "0.75rem",
            marginBottom: "2rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Forms Grid */}
      {filteredForms.length === 0 ? (
        <div
          style={{
            background: "#f9fafb",
            border: "1px dashed #d1d5db",
            borderRadius: "0.75rem",
            padding: "3rem",
            textAlign: "center",
          }}
        >
          <FileText
            size={32}
            style={{
              margin: "0 auto 1rem",
              opacity: 0.5,
              color: "var(--text-muted)",
            }}
          />
          <p style={{ color: "var(--text-muted)", margin: 0 }}>
            {search ? "No forms match your search" : "No forms available"}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {filteredForms.map((form) => (
            <div
              key={form.id}
              onClick={() => onSelectForm(form.id, form)}
              style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "0.75rem",
                padding: "1.5rem",
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#6d28d9";
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 4px 12px rgba(109, 40, 217, 0.15)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb";
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 1px 2px rgba(0, 0, 0, 0.05)";
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "0.5rem",
                    background: "var(--gradient-primary)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <FileText size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      fontSize: "1rem",
                      fontWeight: "700",
                      margin: 0,
                      color: "var(--text-primary)",
                    }}
                  >
                    {form.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      margin: "0.25rem 0 0",
                    }}
                  >
                    v{form.version}
                  </p>
                </div>
              </div>

              {form.description && (
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--text-muted)",
                    margin: "0.75rem 0 0",
                    lineHeight: 1.5,
                  }}
                >
                  {form.description}
                </p>
              )}

              <div
                style={{
                  marginTop: "1rem",
                  paddingTop: "1rem",
                  borderTop: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "0.25rem",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    background: "#dcfce7",
                    color: "#16a34a",
                  }}
                >
                  Active
                </span>
                <span
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "#6d28d9",
                  }}
                >
                  Use →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancel Button */}
      {onCancel && (
        <div style={{ marginTop: "2rem", textAlign: "center" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "0.75rem 2rem",
              background: "transparent",
              border: "1px solid #d1d5db",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
