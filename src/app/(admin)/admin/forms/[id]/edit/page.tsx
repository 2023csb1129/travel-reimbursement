"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface FormField {
  id: string;
  type: "text" | "number" | "date" | "select" | "checkbox" | "textarea";
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface FormTemplate {
  id: string;
  version: number;
  isActive: boolean;
  templateSchema: {
    name: string;
    description?: string;
    fields: FormField[];
  };
  createdAt: string;
  updatedAt: string;
}

export default function FormEditorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const formId = params?.id as string;

  const [form, setForm] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [newFieldType, setNewFieldType] = useState<FormField["type"]>("text");

  // Redirect if not admin
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && session?.user?.role !== "ADMINISTRATOR") {
      router.push("/trips");
    }
  }, [status, session, router]);

  // Fetch form
  useEffect(() => {
    if (!session?.user?.id || !formId) return;

    const fetchForm = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/forms/${formId}`);
        if (!response.ok) throw new Error("Failed to fetch form");

        const data = await response.json();
        setForm(data.form);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [session?.user?.id, formId]);

  if (status === "loading" || loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (!session || session.user?.role !== "ADMINISTRATOR" || !form) {
    return null;
  }

  const handleAddField = () => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type: newFieldType,
      label: "New Field",
      required: false,
      placeholder: "",
    };

    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        templateSchema: {
          ...prev.templateSchema,
          fields: [...prev.templateSchema.fields, newField],
        },
      };
    });
  };

  const handleUpdateField = (fieldId: string, updates: Partial<FormField>) => {
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        templateSchema: {
          ...prev.templateSchema,
          fields: prev.templateSchema.fields.map((f) =>
            f.id === fieldId ? { ...f, ...updates } : f
          ),
        },
      };
    });
  };

  const handleRemoveField = (fieldId: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        templateSchema: {
          ...prev.templateSchema,
          fields: prev.templateSchema.fields.filter((f) => f.id !== fieldId),
        },
      };
    });
  };

  const handleSaveForm = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/forms/${formId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateSchema: form.templateSchema,
        }),
      });

      if (!response.ok) throw new Error("Failed to save form");

      alert("Form saved successfully!");
      router.push("/admin/forms");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save form");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <Link
          href="/admin/forms"
          style={{
            color: "var(--primary)",
            textDecoration: "none",
            fontSize: "0.9rem",
            marginBottom: "1rem",
            display: "inline-block",
          }}
        >
          ← Back to Forms
        </Link>
        <h1 style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--text-primary)", margin: 0 }}>
          {form.templateSchema.name}
        </h1>
        <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: "0.5rem 0 0" }}>
          {form.templateSchema.description}
        </p>
      </div>

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
          Error: {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "2rem" }}>
        {/* Fields Editor */}
        <div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--text-primary)", marginTop: 0 }}>
            Form Fields ({form.templateSchema.fields.length})
          </h3>

          {form.templateSchema.fields.length === 0 ? (
            <div
              style={{
                padding: "2rem",
                background: "var(--bg-secondary)",
                border: "1px dashed var(--border)",
                borderRadius: "0.75rem",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              <p>No fields added yet. Add fields using the panel on the right.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {form.templateSchema.fields.map((field) => (
                <div
                  key={field.id}
                  style={{
                    padding: "1.5rem",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.75rem",
                  }}
                >
                  <div style={{ marginBottom: "1rem" }}>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                      placeholder="Field label"
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        border: "1px solid var(--border)",
                        borderRadius: "0.4rem",
                        background: "var(--bg-primary)",
                        color: "var(--text-primary)",
                        fontSize: "0.95rem",
                        fontWeight: "600",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                    <div>
                      <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Type</label>
                      <select
                        value={field.type}
                        onChange={(e) => handleUpdateField(field.id, { type: e.target.value as FormField["type"] })}
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: "1px solid var(--border)",
                          borderRadius: "0.4rem",
                          background: "var(--bg-primary)",
                          color: "var(--text-primary)",
                          fontSize: "0.85rem",
                        }}
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="select">Select</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="textarea">Textarea</option>
                      </select>
                    </div>

                    <label
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: "0.5rem",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                      />
                      <span>Required</span>
                    </label>
                  </div>

                  {field.type !== "checkbox" && (
                    <div style={{ marginBottom: "1rem" }}>
                      <input
                        type="text"
                        value={field.placeholder || ""}
                        onChange={(e) => handleUpdateField(field.id, { placeholder: e.target.value })}
                        placeholder="Placeholder text"
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: "1px solid var(--border)",
                          borderRadius: "0.4rem",
                          background: "var(--bg-primary)",
                          color: "var(--text-primary)",
                          fontSize: "0.85rem",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  )}

                  {field.type === "select" && (
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                        Options (comma-separated)
                      </label>
                      <textarea
                        value={(field.options || []).join(", ")}
                        onChange={(e) => handleUpdateField(field.id, { options: e.target.value.split(",").map(s => s.trim()) })}
                        placeholder="Option 1, Option 2, Option 3"
                        rows={2}
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: "1px solid var(--border)",
                          borderRadius: "0.4rem",
                          background: "var(--bg-primary)",
                          color: "var(--text-primary)",
                          fontSize: "0.85rem",
                          boxSizing: "border-box",
                          fontFamily: "inherit",
                        }}
                      />
                    </div>
                  )}

                  <button
                    onClick={() => handleRemoveField(field.id)}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      background: "#fee",
                      color: "#c33",
                      border: "1px solid #fcc",
                      borderRadius: "0.4rem",
                      cursor: "pointer",
                      fontWeight: "500",
                      fontSize: "0.85rem",
                    }}
                  >
                    Remove Field
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Field Panel */}
        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "var(--text-primary)", marginTop: 0 }}>
            Add Field
          </h3>

          <div
            style={{
              padding: "1.5rem",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              marginBottom: "1rem",
            }}
          >
            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              Field Type
            </label>
            <select
              value={newFieldType}
              onChange={(e) => setNewFieldType(e.target.value as FormField["type"])}
              style={{
                width: "100%",
                padding: "0.65rem",
                border: "1px solid var(--border)",
                borderRadius: "0.4rem",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                marginBottom: "1rem",
              }}
            >
              <option value="text">Text Input</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="select">Dropdown</option>
              <option value="checkbox">Checkbox</option>
              <option value="textarea">Large Text Area</option>
            </select>

            <button
              onClick={handleAddField}
              style={{
                width: "100%",
                padding: "0.75rem",
                background: "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: "0.4rem",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              ➕ Add Field
            </button>
          </div>

          {/* Form Info */}
          <div
            style={{
              padding: "1rem",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              fontSize: "0.85rem",
              color: "var(--text-muted)",
            }}
          >
            <p style={{ margin: "0 0 0.5rem" }}>
              <strong>Version:</strong> {form.version}
            </p>
            <p style={{ margin: "0 0 0.5rem" }}>
              <strong>Status:</strong> {form.isActive ? "Active" : "Inactive"}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Updated:</strong> {new Date(form.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
        <button
          onClick={handleSaveForm}
          disabled={saving}
          style={{
            padding: "0.75rem 1.5rem",
            background: saving ? "#ccc" : "var(--primary)",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            fontWeight: "600",
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving..." : "Save Form"}
        </button>

        <Link
          href="/admin/forms"
          style={{
            padding: "0.75rem 1.5rem",
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            fontWeight: "600",
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          Cancel
        </Link>
      </div>
    </main>
  );
}
