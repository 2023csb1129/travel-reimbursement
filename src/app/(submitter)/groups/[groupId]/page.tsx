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
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGroupForms();
  }, [groupId]);

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

  const handleSelectForm = async (form: FormTemplate) => {
    try {
      const res = await fetch(`/api/forms/${form.id}`);
      if (!res.ok) throw new Error("Failed to load form");
      const data = await res.json();
      const schema = typeof data.form.templateSchema === "string"
        ? JSON.parse(data.form.templateSchema)
        : data.form.templateSchema;
      setFormSections(schema.sections || []);
      setSelectedForm(data.form);
      setFormData({});
      setSuccess(null);
      setError(null);
    } catch (err) {
      setError("Failed to load form template.");
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
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
          formData,
          status: "SUBMITTED",
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to submit");
      }
      setSuccess("Form submitted successfully!");
      setSelectedForm(null);
      setFormData({});
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
      <div style={{ padding: "3rem", maxWidth: "800px", margin: "0 auto" }}>
        <button
          onClick={() => { setSelectedForm(null); setFormData({}); setError(null); }}
          style={{ marginBottom: "1.5rem", padding: "0.5rem 1rem", background: "transparent", border: "1px solid var(--border)", borderRadius: "0.5rem", cursor: "pointer", fontWeight: 600, color: "var(--text-secondary)" }}
        >
          ← Back to Forms
        </button>

        <div style={{ background: "white", borderRadius: "1rem", border: "1px solid var(--border)", overflow: "hidden" }}>
          <div style={{ background: "linear-gradient(135deg, #1b5e3f 0%, #2d7d5a 100%)", padding: "2rem", color: "white" }}>
            <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>{selectedForm.title}</h2>
            {selectedForm.description && <p style={{ margin: "0.5rem 0 0", opacity: 0.9, fontSize: "0.95rem" }}>{selectedForm.description}</p>}
          </div>

          <div style={{ padding: "2rem" }}>
            {error && <div style={{ padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "0.5rem", color: "#991b1b", marginBottom: "1.5rem", fontWeight: 600, fontSize: "0.9rem" }}>⚠️ {error}</div>}

            {formSections.map((section, sIdx) => (
              <div key={section.id || sIdx} style={{ marginBottom: "2rem" }}>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "2px solid #e2e8f0" }}>
                  {section.title}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {(section.fields || []).map((field: any) => (
                    <div key={field.id}>
                      <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                        {field.label} {field.required && <span style={{ color: "#ef4444" }}>*</span>}
                      </label>
                      {field.type === "textarea" || field.type === "long_text" ? (
                        <textarea
                          value={formData[field.id] || ""}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          placeholder={field.placeholder || ""}
                          rows={3}
                          autoComplete="off"
                          name={field.id}
                          style={{ width: "100%", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.5rem", fontSize: "0.95rem", fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }}
                        />
                      ) : field.type === "select" || field.type === "dropdown" ? (
                        <select
                          value={formData[field.id] || ""}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          style={{ width: "100%", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.5rem", fontSize: "0.95rem", boxSizing: "border-box" }}
                        >
                          <option value="">Select...</option>
                          {(field.options || []).map((opt: any, i: number) => (
                            <option key={i} value={typeof opt === "string" ? opt : opt.value}>{typeof opt === "string" ? opt : opt.label}</option>
                          ))}
                        </select>
                      ) : field.type === "checkbox" ? (
                        <input
                          type="checkbox"
                          checked={!!formData[field.id]}
                          onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                          style={{ width: "1.2rem", height: "1.2rem" }}
                        />
                      ) : field.type === "date" ? (
                        <input
                          type="date"
                          value={formData[field.id] || ""}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          autoComplete="off"
                          name={field.id}
                          style={{ width: "100%", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.5rem", fontSize: "0.95rem", boxSizing: "border-box" }}
                        />
                      ) : field.type === "number" ? (
                        <input
                          type="number"
                          value={formData[field.id] || ""}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          placeholder={field.placeholder || ""}
                          autoComplete="off"
                          name={field.id}
                          style={{ width: "100%", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.5rem", fontSize: "0.95rem", boxSizing: "border-box" }}
                        />
                      ) : (
                        <input
                          type="text"
                          value={formData[field.id] || ""}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          placeholder={field.placeholder || ""}
                          autoComplete="off"
                          name={field.id}
                          style={{ width: "100%", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.5rem", fontSize: "0.95rem", boxSizing: "border-box" }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

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
          </div>
        </div>
      </div>
    );
  }

  // Group forms list view
  return (
    <div style={{ padding: "3rem", maxWidth: "1000px", margin: "0 auto" }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
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
