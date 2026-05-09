"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Clock, XCircle, Plus } from "lucide-react";
import {
  cacheForms,
  getCachedForms,
  cacheSubmissions,
  getCachedSubmissions,
} from "@/lib/offline-db";

interface FormTemplate {
  id: string;
  title: string;
  description: string;
  version: string;
  isActive: boolean;
}

interface Submission {
  id: string;
  templateId: string;
  tripId: string;
  status: string;
  createdAt: string;
  reviewNotes?: string;
  template?: { title?: string };
  trip?: { title?: string };
}

interface ReimbursementsViewProps {
  onSelectForm: (formId: string, tripId?: string) => void;
  onViewSubmission?: (submission: any) => void;
}

export function ReimbursementsView({ onSelectForm, onViewSubmission }: ReimbursementsViewProps) {
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"available" | "history">("available");

  const [searchForms, setSearchForms] = useState("");
  const [sortForms, setSortForms] = useState("title-asc");

  const [searchSubs, setSearchSubs] = useState("");
  const [sortSubs, setSortSubs] = useState("date-desc");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    const fetchData = async () => {
      // ── Serve cached data immediately (offline-first) ──────────────────────
      try {
        const [cachedForms, cachedSubs] = await Promise.all([
          getCachedForms(),
          getCachedSubmissions(),
        ]);
        if (cachedForms.length > 0) setForms(cachedForms as FormTemplate[]);
        if (cachedSubs.length > 0)  setSubmissions(cachedSubs as Submission[]);
        if (cachedForms.length > 0 || cachedSubs.length > 0) setLoading(false);
      } catch (_) {}

      // ── Then refresh from network ──────────────────────────────────────────
      try {
        setError(null);

        const formsRes = await fetch("/api/forms?active=true");
        if (formsRes.ok) {
          const formsData = await formsRes.json();
          const fresh = formsData.forms || formsData;
          setForms(fresh);
          cacheForms(fresh).catch(() => {});
        }

        const submissionsRes = await fetch("/api/submissions");
        if (submissionsRes.ok) {
          const submissionsData = await submissionsRes.json();
          const fresh = submissionsData.submissions || [];
          setSubmissions(fresh);
          cacheSubmissions(fresh).catch(() => {});
        }
      } catch (err) {
        console.error("Error fetching reimbursements data:", err);
        // Only show error if we have no cached data at all
        if (forms.length === 0 && submissions.length === 0) {
          setError("Failed to load reimbursement data");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);  

  const getStatusBadge = (status: string) => {
    const config = {
      DRAFT: { bg: "#f3f4f6", color: "#4b5563", icon: Clock },
      SUBMITTED: { bg: "#dbeafe", color: "#0369a1", icon: Clock },
      UNDER_REVIEW: { bg: "#fef3c7", color: "#92400e", icon: Clock },
      APPROVED: { bg: "#dcfce7", color: "#16a34a", icon: CheckCircle },
      REIMBURSED: { bg: "#f3e8ff", color: "#7c3aed", icon: CheckCircle },
      REJECTED: { bg: "#fee2e2", color: "#dc2626", icon: XCircle },
    };

    const conf = config[status as keyof typeof config] || config.SUBMITTED;
    const Icon = conf.icon;

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          backgroundColor: conf.bg,
          color: conf.color,
          padding: "0.5rem 1rem",
          borderRadius: "0.375rem",
          fontSize: "0.875rem",
          fontWeight: "600",
        }}
      >
        <Icon size={16} />
        {status.replace(/_/g, " ")}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "3rem" }}>
        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
        <p style={{ color: "#666" }}>Loading reimbursements...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Tab Navigation */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          borderBottom: "1px solid #e5e7eb",
          marginBottom: "2rem",
          paddingBottom: "1rem",
        }}
      >
        <button
          onClick={() => setActiveTab("available")}
          style={{
            padding: "0.75rem 1.5rem",
            borderBottom: activeTab === "available" ? "2px solid #1f2937" : "none",
            background: "transparent",
            cursor: "pointer",
            fontWeight: activeTab === "available" ? "600" : "500",
            color: activeTab === "available" ? "#1f2937" : "#6b7280",
            fontSize: "1rem",
          }}
        >
          Available Forms ({forms.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          style={{
            padding: "0.75rem 1.5rem",
            borderBottom: activeTab === "history" ? "2px solid #1f2937" : "none",
            background: "transparent",
            cursor: "pointer",
            fontWeight: activeTab === "history" ? "600" : "500",
            color: activeTab === "history" ? "#1f2937" : "#6b7280",
            fontSize: "1rem",
          }}
        >
          My Reimbursements ({submissions.length})
        </button>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: "#fee2e2",
            border: "1px solid #fecaca",
            borderRadius: "0.375rem",
            padding: "1rem",
            marginBottom: "2rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            color: "#dc2626",
          }}
        >
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Available Forms Tab */}
      {activeTab === "available" && (() => {
        const processedForms = forms
          .filter(f => (f.title || "").toLowerCase().includes(searchForms.toLowerCase()) || (f.description || "").toLowerCase().includes(searchForms.toLowerCase()))
          .sort((a, b) => {
            if (sortForms === "title-asc") return a.title.localeCompare(b.title);
            if (sortForms === "title-desc") return b.title.localeCompare(a.title);
            return 0;
          });

        return (
          <div>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              <input 
                type="text" 
                placeholder="Search forms..." 
                value={searchForms}
                onChange={e => setSearchForms(e.target.value)}
                style={{ flex: 1, minWidth: "200px", padding: "0.6rem 0.8rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", fontSize: "0.9rem" }}
              />
              <select 
                value={sortForms}
                onChange={e => setSortForms(e.target.value)}
                style={{ padding: "0.6rem 1rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", fontSize: "0.9rem", backgroundColor: "#fff", cursor: "pointer" }}
              >
                <option value="title-asc">Title: A-Z</option>
                <option value="title-desc">Title: Z-A</option>
              </select>
            </div>

            {processedForms.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem",
                  backgroundColor: "#f9fafb",
                  borderRadius: "0.5rem",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📋</div>
                <p style={{ color: "#6b7280" }}>{forms.length === 0 ? "No forms available at the moment" : "No forms match your search"}</p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: "1.5rem",
                }}
              >
                {processedForms.map((form) => (
                <div
                  key={form.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    padding: "1.5rem",
                    backgroundColor: "#fff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                    transition: "all 0.2s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 10px 25px rgba(0,0,0,0.1)";
                    e.currentTarget.style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 1px 3px rgba(0,0,0,0.1)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: "600",
                        color: "#1f2937",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {form.title}
                    </h3>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "#6b7280",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {form.description}
                    </p>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                        display: "inline-block",
                      }}
                    >
                      v{form.version}
                    </span>
                  </div>
                  <button
                    onClick={() => onSelectForm(form.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      backgroundColor: "#1f2937",
                      color: "#fff",
                      padding: "0.75rem 1.5rem",
                      borderRadius: "0.375rem",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "0.95rem",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#111827";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#1f2937";
                    }}
                  >
                    <Plus size={18} />
                    Fill Form
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ); })()}

      {/* Reimbursements History Tab */}
      {activeTab === "history" && (() => {
        const processedSubs = submissions
          .filter(s => statusFilter === "ALL" || s.status === statusFilter)
          .filter(s => 
            (s.template?.title?.toLowerCase() || "").includes(searchSubs.toLowerCase()) || 
            (s.trip?.title?.toLowerCase() || "").includes(searchSubs.toLowerCase())
          )
          .sort((a, b) => {
            if (sortSubs === "date-desc") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (sortSubs === "date-asc") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            return 0;
          });

        return (
          <div>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              <input 
                type="text" 
                placeholder="Search by trip or form..." 
                value={searchSubs}
                onChange={e => setSearchSubs(e.target.value)}
                style={{ flex: 1, minWidth: "200px", padding: "0.6rem 0.8rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", fontSize: "0.9rem" }}
              />
              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: "0.6rem 1rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", fontSize: "0.9rem", backgroundColor: "#fff", cursor: "pointer" }}
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Drafts</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REIMBURSED">Reimbursed</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <select 
                value={sortSubs}
                onChange={e => setSortSubs(e.target.value)}
                style={{ padding: "0.6rem 1rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", fontSize: "0.9rem", backgroundColor: "#fff", cursor: "pointer" }}
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
              </select>
            </div>

            {processedSubs.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem",
                  backgroundColor: "#f9fafb",
                  borderRadius: "0.5rem",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📊</div>
                <p style={{ color: "#6b7280" }}>
                  {submissions.length === 0 ? "No reimbursements yet. Fill a form to get started!" : "No reimbursements match your filters."}
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                {processedSubs.map((submission) => (
                <div
                  key={submission.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    padding: "1.5rem",
                    backgroundColor: "#fff",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "2rem",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "#6b7280",
                        marginBottom: "0.25rem",
                      }}
                    >
                      ID: {submission.id.slice(0, 8).toUpperCase()}
                    </p>
                    <h4
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: "600",
                        color: "#1f2937",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {submission.template?.title || "Reimbursement Form"}
                    </h4>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "#6b7280",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Trip: {submission.trip?.title || "Unknown"}
                    </p>
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "#9ca3af",
                      }}
                    >
                      Submitted:{" "}
                      {new Date(submission.createdAt).toLocaleDateString()}
                    </p>
                    {submission.reviewNotes && (
                      <div
                        style={{
                          marginTop: "0.75rem",
                          padding: "0.75rem",
                          backgroundColor: "#f3f4f6",
                          borderRadius: "0.375rem",
                          fontSize: "0.875rem",
                          color: "#4b5563",
                          borderLeft: "3px solid #9ca3af",
                        }}
                      >
                        <strong>Notes:</strong> {submission.reviewNotes}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: "0.75rem",
                    }}
                  >
                    {getStatusBadge(submission.status)}
                    {(submission.status === "DRAFT" || submission.status === "APPROVED" || submission.status === "REJECTED" || submission.status === "REIMBURSED") && (
                      <button
                        onClick={() => onViewSubmission && onViewSubmission(submission)}
                        style={{
                          padding: "0.5rem 1rem",
                          fontSize: "0.85rem",
                          fontWeight: "600",
                          color: "#4b5563",
                          backgroundColor: "#f3f4f6",
                          border: "1px solid #d1d5db",
                          borderRadius: "0.375rem",
                          cursor: "pointer",
                        }}
                      >
                        {submission.status === "DRAFT" ? "Resume / Edit" : "View / Print"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ); })()}
    </div>
  );
}
