"use client";

import { useState, useEffect } from "react";

interface Submission {
  id: string;
  status: string;
  submissionDate?: string;
  createdAt: string;
  formData?: string;
  reviewNotes?: string;
  template?: { id: string; title: string; version: number; templateSchema?: string };
  trip?: { id: string; title: string };
}

export default function MyResponsesPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "SUBMITTED" | "UNDER_REVIEW" | "REIMBURSED">("all");

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const res = await fetch("/api/submissions");
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error("Failed to fetch submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "SUBMITTED": return { bg: "#fef3c7", color: "#92400e", label: "Submitted" };
      case "UNDER_REVIEW": return { bg: "#dcfce7", color: "#16a34a", label: "Reviewed" };
      case "REIMBURSED": return { bg: "#dbeafe", color: "#1d4ed8", label: "Settled" };
      default: return { bg: "#f3f4f6", color: "#6b7280", label: status };
    }
  };

  const filtered = submissions.filter(s => filter === "all" || s.status === filter);

  const parseFormData = (fd: string | undefined) => {
    if (!fd) return null;
    try { return JSON.parse(fd); } catch { return null; }
  };

  const parseSections = (schema: string | undefined) => {
    if (!schema) return [];
    try {
      const parsed = typeof schema === "string" ? JSON.parse(schema) : schema;
      return parsed.sections || [];
    } catch { return []; }
  };

  if (loading) {
    return <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>Loading your responses...</div>;
  }

  return (
    <div style={{ padding: "3rem", maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 1rem" }}>My Form Responses</h1>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {[
            { key: "all", label: "All" },
            { key: "SUBMITTED", label: "Submitted" },
            { key: "UNDER_REVIEW", label: "Reviewed" },
            { key: "REIMBURSED", label: "Settled" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              style={{
                padding: "0.5rem 1.25rem",
                background: filter === tab.key ? "linear-gradient(135deg, #1b5e3f 0%, #2d7d5a 100%)" : "white",
                color: filter === tab.key ? "white" : "var(--text-primary)",
                border: filter === tab.key ? "none" : "1px solid #d1d5db",
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.875rem",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: "white", padding: "4rem 2rem", borderRadius: "1rem", textAlign: "center", border: "1px dashed var(--border)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📋</div>
          <h3 style={{ fontSize: "1.25rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>No Responses Yet</h3>
          <p style={{ color: "var(--text-muted)" }}>You haven't submitted any forms yet. Go to "My Groups" to fill out forms.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filtered.map(sub => {
            const st = getStatusStyle(sub.status);
            const isExpanded = expandedId === sub.id;
            const formData = parseFormData(sub.formData);
            const sections = parseSections(sub.template?.templateSchema);

            return (
              <div key={sub.id} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "0.75rem", overflow: "hidden" }}>
                <div
                  onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                  style={{ padding: "1.25rem 1.5rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "1rem", background: isExpanded ? "#f9fafb" : "white" }}
                >
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                      {sub.template?.title || "Unknown Form"}
                    </h3>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      Submitted {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  <span style={{
                    display: "inline-block",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "9999px",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    background: st.bg,
                    color: st.color,
                  }}>
                    {st.label}
                  </span>
                  <span style={{ fontSize: "1.2rem", color: "#94a3b8" }}>{isExpanded ? "▲" : "▼"}</span>
                </div>

                {isExpanded && (
                  <div style={{ padding: "1.5rem", borderTop: "1px solid #e5e7eb", background: "#f9fafb" }}>
                    {sub.reviewNotes && (
                      <div style={{ padding: "0.75rem 1rem", background: "#dbeafe", borderRadius: "0.5rem", color: "#1d4ed8", fontWeight: 600, fontSize: "0.875rem", marginBottom: "1rem" }}>
                        📝 Review Notes: {sub.reviewNotes}
                      </div>
                    )}

                    {formData && sections.length > 0 ? (
                      <div>
                        {sections.map((section: any, sIdx: number) => (
                          <div key={sIdx} style={{ marginBottom: "1.5rem" }}>
                            <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem", paddingBottom: "0.5rem", borderBottom: "2px solid #e2e8f0" }}>
                              {section.title}
                            </h4>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                              {(section.fields || []).map((field: any) => (
                                <div key={field.id} style={{ padding: "0.75rem", background: "white", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
                                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                                    {field.label}
                                  </div>
                                  <div style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontWeight: 500 }}>
                                    {formData[field.id] !== undefined && formData[field.id] !== "" 
                                      ? (typeof formData[field.id] === "boolean" ? (formData[field.id] ? "Yes" : "No") : String(formData[field.id]))
                                      : "—"
                                    }
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : formData ? (
                      <div>
                        <h4 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>Response Data</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                          {Object.entries(formData).filter(([k]) => !k.startsWith("_")).map(([key, val]) => (
                            <div key={key} style={{ padding: "0.75rem", background: "white", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
                              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.25rem" }}>{key}</div>
                              <div style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>{String(val as any) || "—"}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No form data available.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
