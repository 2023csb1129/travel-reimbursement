"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormSection } from "@/types/forms";
import { FormBuilder } from "@/components/FormBuilder";
import { OfflineGuard } from "@/components/OfflineGuard";

interface AdminGroup {
  id: string;
  name: string;
  groupId: string;
}

interface FormTemplate {
  id: string;
  title: string;
  description?: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  group?: { id: string; name: string; groupId: string };
}

export default function FormManagementPage() {
  return (
    <OfflineGuard featureName="Form management">
      <FormManagementContent />
    </OfflineGuard>
  );
}

function FormManagementContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFormTitle, setNewFormTitle] = useState("");
  const [newFormDesc, setNewFormDesc] = useState("");
  const [creatingForm, setCreatingForm] = useState(false);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [editingSections, setEditingSections] = useState<FormSection[]>([]);
  const [editingMetadata, setEditingMetadata] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [filterGroupId, setFilterGroupId] = useState<string>("all");

  // Redirect if not admin
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && session?.user?.role !== "ADMINISTRATOR") {
      router.push("/trips");
    }
  }, [status, session, router]);

  // Fetch forms
  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchForms = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/forms-builder");
        if (!response.ok) throw new Error("Failed to fetch forms");

        const data = await response.json();
        setForms(data.forms || []);
        setGroups(data.groups || []);
        if (data.groups?.length > 0 && !selectedGroupId) {
          setSelectedGroupId(data.groups[0].id);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setForms([]);
      } finally {
        setLoading(false);
      }
    };

    fetchForms();
  }, [session?.user?.id]);

  const handleCreateForm = async () => {
    if (!newFormTitle.trim()) {
      setError("Form title is required.");
      return;
    }

    try {
      setCreatingForm(true);
      setError(null);

      const templateSchema = {
        metadata: { requiresTripLink: false },
        sections: [
          {
            id: "section-1",
            title: "General Information",
            fields: [],
            position: 0,
          },
        ],
      };

      if (!selectedGroupId) {
        setError("Please select a group first.");
        setCreatingForm(false);
        return;
      }

      const response = await fetch("/api/forms-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newFormTitle,
          description: newFormDesc || null,
          templateSchema,
          groupId: selectedGroupId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create form");
      }

      const data = await response.json();
      setForms([...forms, data.form]);
      setNewFormTitle("");
      setNewFormDesc("");
      setShowCreateForm(false);
      setEditingFormId(data.form.id);
      setEditingSections(templateSchema.sections);
      setEditingMetadata(templateSchema.metadata);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create form");
    } finally {
      setCreatingForm(false);
    }
  };

  const handleEditForm = async (formId: string) => {
    try {
      const response = await fetch(`/api/forms-builder/${formId}`);
      if (!response.ok) throw new Error("Failed to fetch form");

      const data = await response.json();
      setEditingFormId(formId);
      setEditingSections(data.form.templateSchema.sections || []);
      setEditingMetadata(data.form.templateSchema.metadata || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load form");
    }
  };

  const handleSaveForm = async (sections: FormSection[], metadata?: any) => {
    if (!editingFormId) return;

    try {
      const form = forms.find((f) => f.id === editingFormId);
      if (!form) return;

      const response = await fetch(`/api/forms-builder/${editingFormId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          templateSchema: { sections, metadata },
        }),
      });

      if (!response.ok) throw new Error("Failed to save form");

      setEditingFormId(null);
      alert("Form saved successfully!");

      // Refresh forms list
      const listResponse = await fetch("/api/forms-builder");
      if (listResponse.ok) {
        const data = await listResponse.json();
        setForms(data.forms || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save form");
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!confirm("Are you sure you want to delete this form?")) return;

    try {
      const response = await fetch(`/api/forms-builder/${formId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete form");
      }

      setForms(forms.filter((f) => f.id !== formId));
      alert("Form deleted successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete form");
    }
  };

  const handleToggleActive = async (formId: string, isActive: boolean) => {
    const form = forms.find((f) => f.id === formId);
    if (!form) return;

    try {
      const response = await fetch(`/api/forms-builder/${formId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !isActive,
        }),
      });

      if (!response.ok) throw new Error("Failed to update form status");

      setForms(
        forms.map((f) =>
          f.id === formId ? { ...f, isActive: !isActive } : f
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update form");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!session || session.user?.role !== "ADMINISTRATOR") {
    return null;
  }

  // Form editor view
  if (editingFormId) {
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "1rem", borderBottom: "1px solid var(--border)" }}>
          <button
            onClick={() => setEditingFormId(null)}
            style={{
              padding: "0.5rem 1rem",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            ← Back to Forms
          </button>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <FormBuilder
            initialSections={editingSections}
            initialMetadata={editingMetadata}
            onSave={handleSaveForm}
            loading={false}
          />
        </div>
      </div>
    );
  }

  // Form management list view
  return (
    <main style={{ padding: "3rem 2rem", maxWidth: "1200px", margin: "0 auto", background: "#f8fafc", minHeight: "100vh" }}>
      <div
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: "1rem",
          padding: "3rem 3.5rem",
          marginBottom: "3rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
        }}
      >
        <div>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "800", color: "white", margin: "0 0 0.5rem", letterSpacing: "-0.5px" }}>
            Form Templates
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "1.1rem", margin: 0, fontWeight: "500" }}>
            Manage and construct sophisticated reimbursement formats
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            padding: "0.875rem 1.75rem",
            background: showCreateForm ? "rgba(255, 255, 255, 0.1)" : "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
            color: "white",
            border: showCreateForm ? "1px solid rgba(255,255,255,0.2)" : "none",
            borderRadius: "9999px",
            fontWeight: "700",
            cursor: "pointer",
            fontSize: "1rem",
            boxShadow: showCreateForm ? "none" : "0 10px 15px -3px rgba(109, 40, 217, 0.4)",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            if (!showCreateForm) {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 15px 20px -3px rgba(109, 40, 217, 0.5)";
            }
          }}
          onMouseLeave={(e) => {
            if (!showCreateForm) {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(109, 40, 217, 0.4)";
            }
          }}
        >
          {showCreateForm ? "Close Builder" : "✨ Create New Form"}
        </button>
      </div>

      {/* Filter and Search */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search forms by title or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: "300px",
            padding: "0.875rem 1rem",
            border: "1px solid #cbd5e1",
            borderRadius: "0.75rem",
            fontSize: "1rem",
            color: "#0f172a",
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          style={{
            padding: "0.875rem 1rem",
            border: "1px solid #cbd5e1",
            borderRadius: "0.75rem",
            fontSize: "1rem",
            color: "#0f172a",
            background: "white",
            minWidth: "150px",
          }}
        >
          <option value="all">All Forms</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
        {groups.length > 1 && (
          <select
            value={filterGroupId}
            onChange={(e) => setFilterGroupId(e.target.value)}
            style={{
              padding: "0.875rem 1rem",
              border: "1px solid #cbd5e1",
              borderRadius: "0.75rem",
              fontSize: "1rem",
              color: "#0f172a",
              background: "white",
              minWidth: "180px",
            }}
          >
            <option value="all">All Groups</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: "1rem 1.5rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "0.75rem",
            color: "#991b1b",
            marginBottom: "2rem",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {showCreateForm && (
        <div
          style={{
            padding: "2.5rem",
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.8)",
            borderRadius: "1.25rem",
            marginBottom: "3rem",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.08)",
          }}
        >
          <h3 style={{ fontSize: "1.5rem", fontWeight: "800", marginTop: 0, color: "#1e293b", marginBottom: "2rem" }}>
            Initialize Format
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.95rem", fontWeight: "700", color: "#475569", marginBottom: "0.5rem" }}>
                Form Title <span style={{color: "#ef4444"}}>*</span>
              </label>
              <input
                type="text"
                value={newFormTitle}
                onChange={(e) => setNewFormTitle(e.target.value)}
                placeholder="e.g., Q3 Travel Reimbursement Form"
                style={{
                  width: "100%",
                  padding: "1rem",
                  border: "2px solid #e2e8f0",
                  borderRadius: "0.75rem",
                  background: "#f8fafc",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                  transition: "all 0.2s",
                  color: "#0f172a",
                  fontWeight: "500"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#8b5cf6";
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139, 92, 246, 0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.background = "#f8fafc";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.95rem", fontWeight: "700", color: "#475569", marginBottom: "0.5rem" }}>
                Description
              </label>
              <textarea
                value={newFormDesc}
                onChange={(e) => setNewFormDesc(e.target.value)}
                placeholder="Brief description of what this form is for..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "1rem",
                  border: "2px solid #e2e8f0",
                  borderRadius: "0.75rem",
                  background: "#f8fafc",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  transition: "all 0.2s",
                  color: "#0f172a",
                  fontWeight: "500",
                  resize: "vertical"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#8b5cf6";
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139, 92, 246, 0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.background = "#f8fafc";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {groups.length > 0 && (
              <div>
                <label style={{ display: "block", fontSize: "0.95rem", fontWeight: "700", color: "#475569", marginBottom: "0.5rem" }}>
                  Group <span style={{color: "#ef4444"}}>*</span>
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "1rem",
                    border: "2px solid #e2e8f0",
                    borderRadius: "0.75rem",
                    background: "#f8fafc",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                    color: "#0f172a",
                    fontWeight: "500"
                  }}
                >
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            )}
            {groups.length === 0 && (
              <div style={{ padding: "1rem", background: "#fef9e7", border: "1px solid #fcd34d", borderRadius: "0.75rem", fontSize: "0.9rem", color: "#92400e", fontWeight: "600" }}>
                ⚠️ You must create a group first before creating forms. Go to "Manage Groups" to create one.
              </div>
            )}

            <button
              onClick={handleCreateForm}
              disabled={creatingForm || groups.length === 0}
              style={{
                alignSelf: "flex-start",
                padding: "1rem 2rem",
                background: (creatingForm || groups.length === 0) ? "#cbd5e1" : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "white",
                border: "none",
                borderRadius: "0.75rem",
                fontWeight: "700",
                fontSize: "1rem",
                cursor: (creatingForm || groups.length === 0) ? "not-allowed" : "pointer",
                boxShadow: (creatingForm || groups.length === 0) ? "none" : "0 4px 14px 0 rgba(16, 185, 129, 0.39)",
                transition: "all 0.3s",
              }}
            >
              {creatingForm ? "Initializing Builder..." : "Start Building →"}
            </button>
          </div>
        </div>
      )}

      {(() => {
        const filteredForms = forms.filter((form) => {
          if (statusFilter === "active" && !form.isActive) return false;
          if (statusFilter === "inactive" && form.isActive) return false;
          if (filterGroupId !== "all" && form.group?.id !== filterGroupId) return false;
          
          if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const title = form.title.toLowerCase();
            const desc = (form.description || "").toLowerCase();
            return title.includes(term) || desc.includes(term);
          }
          return true;
        });

        if (filteredForms.length === 0) {
          return (
            <div
              style={{
                textAlign: "center",
                padding: "5rem 2rem",
                background: "white",
                borderRadius: "1.25rem",
                border: "1px dashed #cbd5e1",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
              }}
            >
              <div style={{ fontSize: "4rem", marginBottom: "1.5rem", opacity: 0.5 }}>📝</div>
              <h2 style={{ color: "#334155", fontSize: "1.5rem", fontWeight: "800", margin: "0 0 0.5rem" }}>No Templates Found</h2>
              <p style={{ color: "#64748b", fontSize: "1.1rem", margin: 0 }}>Try adjusting your filters or click "Create New Form" above to author a new format.</p>
            </div>
          );
        }

        return (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: "2rem",
            }}
          >
            {filteredForms.map((form) => (
            <div
              key={form.id}
              style={{
                padding: "2rem",
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative",
                overflow: "hidden"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-6px)";
                e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)";
                e.currentTarget.style.borderColor = "#cbd5e1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)";
                e.currentTarget.style.borderColor = "#e2e8f0";
              }}
            >
              {/* Decorative top border */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: form.isActive ? "linear-gradient(90deg, #10b981, #34d399)" : "#cbd5e1" }} />
              
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                    {form.title}
                  </h3>
                </div>
                {form.group && (
                  <span style={{ display: "inline-block", background: "#eff6ff", color: "#1d4ed8", padding: "0.15rem 0.6rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: "700", marginBottom: "0.5rem", border: "1px solid #bfdbfe" }}>
                    {form.group.name}
                  </span>
                )}
                <p style={{ fontSize: "0.95rem", color: "#64748b", margin: 0, lineHeight: "1.5", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {form.description || "No description provided."}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "1.5rem",
                  borderBottom: "1px solid #f1f5f9",
                  marginTop: "auto"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#f8fafc", padding: "0.25rem 0.75rem", borderRadius: "9999px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Version</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: "800", color: "#334155" }}>{form.version}.0</span>
                </div>
                
                {form.isActive ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#ecfdf5", padding: "0.35rem 0.85rem", borderRadius: "9999px", border: "1px solid #a7f3d0" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                    <span style={{ color: "#065f46", fontWeight: "700", fontSize: "0.85rem" }}>Active</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#f1f5f9", padding: "0.35rem 0.85rem", borderRadius: "9999px", border: "1px solid #e2e8f0" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#94a3b8" }} />
                    <span style={{ color: "#475569", fontWeight: "700", fontSize: "0.85rem" }}>Inactive</span>
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                }}
              >
                <button
                  onClick={() => handleEditForm(form.id)}
                  style={{
                    padding: "0.75rem",
                    background: "#f8fafc",
                    color: "#334155",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.75rem",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "0.9rem",
                    transition: "all 0.2s",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f1f5f9";
                    e.currentTarget.style.borderColor = "#cbd5e1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#f8fafc";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                  }}
                >
                   ✎ Edit Layout
                </button>

                <button
                  onClick={() => handleToggleActive(form.id, form.isActive)}
                  style={{
                    padding: "0.75rem",
                    background: form.isActive ? "#fff1f2" : "#f0fdf4",
                    color: form.isActive ? "#be123c" : "#15803d",
                    border: `1px solid ${form.isActive ? "#ffe4e6" : "#dcfce7"}`,
                    borderRadius: "0.75rem",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "0.9rem",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = form.isActive ? "#ffe4e6" : "#dcfce7";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = form.isActive ? "#fff1f2" : "#f0fdf4";
                  }}
                >
                  {form.isActive ? "Deactivate" : "Activate"}
                </button>

                <button
                  onClick={() => handleDeleteForm(form.id)}
                  style={{
                    gridColumn: "1 / -1",
                    padding: "0.75rem",
                    background: "transparent",
                    color: "#94a3b8",
                    border: "none",
                    borderRadius: "0.75rem",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "0.85rem",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#ef4444";
                    e.currentTarget.style.background = "#fef2f2";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#94a3b8";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  🗑️ Delete Template
                </button>
              </div>
            </div>
          ))}
        </div>
        );
      })()}
    </main>
  );
}
