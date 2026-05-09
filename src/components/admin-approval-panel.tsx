"use client";

import { useState, useEffect } from "react";
import { CheckCircle, AlertCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { FormInterface } from "./form-interface";

interface Submission {
  id: string;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "REIMBURSED";
  submissionDate?: string;
  template?: { id: string; version: number; templateSchema?: any };
  user?: { id: string; email: string; name: string };
  trip?: { id: string; title: string };
  createdAt: string;
  signatures?: string;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  status: string;
  paymentDate: string;
}

export const AdminApprovalPanel: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [expenses, setExpenses] = useState<Record<string, Expense[]>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed" | "settled">("all");
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [signatureStatuses, setSignatureStatuses] = useState<Record<string, Record<string, boolean>>>({});
  const [fullSubmissions, setFullSubmissions] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSubmissions();
  }, [filter]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const url = new URL("/api/submissions", window.location.href);
      if (filter === "pending") {
        url.searchParams.set("status", "SUBMITTED");
      } else if (filter === "reviewed") {
        url.searchParams.set("status", "UNDER_REVIEW");
      } else if (filter === "settled") {
        url.searchParams.set("status", "REIMBURSED");
      }

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissionExpenses = async (submissionId: string, tripId?: string) => {
    if (!tripId || expenses[submissionId]) return;

    try {
      const res = await fetch(`/api/expenses?tripId=${tripId}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses((prev) => ({
          ...prev,
          [submissionId]: data.expenses || [],
        }));
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
    }
  };

  const fetchSubmissionDetails = async (submissionId: string) => {
    if (fullSubmissions[submissionId]) return;
    try {
      const res = await fetch(`/api/submissions/${submissionId}`);
      if (res.ok) {
        const data = await res.json();
        setFullSubmissions((prev) => ({
          ...prev,
          [submissionId]: data.submission,
        }));
      }
    } catch (error) {
      console.error("Error fetching submission details:", error);
    }
  };

  const handleMarkReviewed = async (submissionId: string) => {
    try {
      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "UNDER_REVIEW",
          reviewNotes: reviewNotes[submissionId] || "Marked as reviewed",
        }),
      });

      if (res.ok) {
        setSubmissions((prev) =>
          prev.map((sub) =>
            sub.id === submissionId
              ? { ...sub, status: "UNDER_REVIEW" }
              : sub
          )
        );
        if (filter === "pending") {
          fetchSubmissions();
        }
      }
    } catch (error) {
      console.error("Error marking as reviewed:", error);
    }
  };

  const handleMarkSettled = async (submissionId: string) => {
    try {
      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REIMBURSED" }),
      });
      if (res.ok) {
        setSubmissions((prev) =>
          prev.map((sub) =>
            sub.id === submissionId ? { ...sub, status: "REIMBURSED" } : sub
          )
        );
        if (filter === "reviewed") fetchSubmissions();
      }
    } catch (error) {
      console.error("Error marking as settled:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return { bg: "#fef3c7", color: "#92400e", icon: "◆", label: "Submitted" };
      case "UNDER_REVIEW":
        return { bg: "#dcfce7", color: "#16a34a", icon: "✓", label: "Reviewed" };
      case "REIMBURSED":
        return { bg: "#dbeafe", color: "#1d4ed8", icon: "✓", label: "Settled" };
      case "APPROVED":
        return { bg: "#dcfce7", color: "#16a34a", icon: "✓", label: "Approved" };
      case "REJECTED":
        return { bg: "#fee2e2", color: "#dc2626", icon: "✕", label: "Rejected" };
      default:
        return { bg: "#f3f4f6", color: "#6b7280", icon: "•", label: status };
    }
  };

  const filteredSubmissions = submissions.filter((sub) => {
    let matchesFilter = true;
    if (filter === "pending") matchesFilter = sub.status === "SUBMITTED";
    else if (filter === "reviewed") matchesFilter = sub.status === "UNDER_REVIEW";
    else if (filter === "settled") matchesFilter = sub.status === "REIMBURSED";

    if (!matchesFilter) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const tripTitle = (sub.trip?.title || "").toLowerCase();
      const userName = (sub.user?.name || "").toLowerCase();
      const userEmail = (sub.user?.email || "").toLowerCase();
      return tripTitle.includes(term) || userName.includes(term) || userEmail.includes(term);
    }
    return true;
  });

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)" }}>Loading submissions...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "800", margin: "0 0 1rem" }}>
          Submission Management
        </h1>

        {/* Filter Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {[
            { key: "all", label: "All Submissions" },
            { key: "pending", label: "Submitted" },
            { key: "reviewed", label: "Reviewed" },
            { key: "settled", label: "Settled" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              style={{
                padding: "0.75rem 1.5rem",
                background:
                  filter === tab.key
                    ? "var(--gradient-primary)"
                    : "transparent",
                color: filter === tab.key ? "white" : "var(--text-primary)",
                border:
                  filter === tab.key
                    ? "none"
                    : "1px solid #d1d5db",
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "0.9rem",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div style={{ marginTop: "1rem" }}>
          <input
            type="text"
            placeholder="Search by trip title, user name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              maxWidth: "400px",
              padding: "0.75rem 1rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.5rem",
              fontSize: "0.9rem",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <div
          style={{
            background: "#f9fafb",
            border: "1px dashed #d1d5db",
            borderRadius: "0.75rem",
            padding: "3rem",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          <Clock size={32} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
          <p>No submissions found for this filter.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filteredSubmissions.map((submission) => {
            const statusColor = getStatusColor(submission.status);
            const isExpanded = expandedSubmissionId === submission.id;

            return (
              <div
                key={submission.id}
                style={{
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.75rem",
                  overflow: "hidden",
                }}
              >
                {/* Header */}
                <div
                  onClick={() => {
                    setExpandedSubmissionId(isExpanded ? null : submission.id);
                    if (!isExpanded) {
                      fetchSubmissionExpenses(submission.id, submission.trip?.id);
                      fetchSubmissionDetails(submission.id);
                    }
                  }}
                  style={{
                    padding: "1.5rem",
                    background: isExpanded ? "#f9fafb" : "white",
                    borderBottom: isExpanded ? "1px solid #e5e7eb" : "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: statusColor.bg,
                      color: statusColor.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.25rem",
                      fontWeight: "700",
                      flexShrink: 0,
                    }}
                  >
                    {statusColor.icon}
                  </div>

                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: "700", margin: 0 }}>
                      {submission.trip?.title || "Unknown Trip"}
                    </h3>
                    <p
                      style={{
                        margin: "0.25rem 0 0",
                        fontSize: "0.875rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      Submitted by {submission.user?.name || submission.user?.email}
                    </p>
                  </div>

                  <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "0.25rem 0.75rem",
                          borderRadius: "0.25rem",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          background: statusColor.bg,
                          color: statusColor.color,
                        }}
                      >
                        {getStatusColor(submission.status).label}
                      </span>
                      <p
                        style={{
                          margin: "0.5rem 0 0",
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {submission.createdAt
                          ? new Date(submission.createdAt).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div
                    style={{
                      padding: "1.5rem",
                      borderTop: "1px solid #e5e7eb",
                      background: "#f9fafb",
                    }}
                  >
                    {/* Submission Info */}
                    <div style={{ marginBottom: "1.5rem" }}>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "0.75rem" }}>
                        Submission Details
                      </h4>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", fontSize: "0.875rem" }}>
                        <div>
                          <p style={{ color: "var(--text-muted)", margin: 0, fontWeight: "500" }}>ID</p>
                          <p
                            style={{
                              margin: "0.25rem 0 0",
                              fontFamily: "monospace",
                              fontSize: "0.75rem",
                              wordBreak: "break-all",
                            }}
                          >
                            {submission.id}
                          </p>
                        </div>
                        <div>
                          <p style={{ color: "var(--text-muted)", margin: 0, fontWeight: "500" }}>Submitted</p>
                          <p style={{ margin: "0.25rem 0 0" }}>
                            {submission.createdAt
                              ? new Date(submission.createdAt).toLocaleString()
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p style={{ color: "var(--text-muted)", margin: 0, fontWeight: "500" }}>Form Version</p>
                          <p style={{ margin: "0.25rem 0 0" }}>
                            {submission.template?.version ? `v${submission.template.version}` : "v1"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Filled Form Details */}
                    <div style={{ marginBottom: "1.5rem" }}>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "0.75rem" }}>
                        Filled Form Details
                      </h4>
                      {fullSubmissions[submission.id] ? (
                        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "0.5rem", overflow: "hidden", maxHeight: "600px", overflowY: "auto" }}>
                          <FormInterface
                            tripId={submission.trip?.id || ""}
                            formId={submission.template?.id || ""}
                            submissionData={fullSubmissions[submission.id]}
                          />
                        </div>
                      ) : (
                        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Loading form details...</p>
                      )}
                    </div>

                    {/* Expenses */}
                    {expenses[submission.id]?.length > 0 && (
                      <div style={{ marginBottom: "1.5rem" }}>
                        <h4 style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "0.75rem" }}>
                          Trip Expenses ({expenses[submission.id].length})
                        </h4>
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "0.875rem",
                          }}
                        >
                          <thead>
                            <tr style={{ borderBottom: "1px solid #d1d5db" }}>
                              <th style={{ padding: "0.5rem", textAlign: "left", fontWeight: "600" }}>Description</th>
                              <th style={{ padding: "0.5rem", textAlign: "right", fontWeight: "600" }}>Amount</th>
                              <th style={{ padding: "0.5rem", textAlign: "left", fontWeight: "600" }}>Category</th>
                              <th style={{ padding: "0.5rem", textAlign: "center", fontWeight: "600" }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {expenses[submission.id].map((exp) => (
                              <tr key={exp.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                                <td style={{ padding: "0.5rem" }}>{exp.title}</td>
                                <td style={{ padding: "0.5rem", textAlign: "right", fontWeight: "600" }}>
                                  ₹{exp.amount?.toLocaleString()}
                                </td>
                                <td style={{ padding: "0.5rem" }}>{exp.category}</td>
                                <td style={{ padding: "0.5rem", textAlign: "center" }}>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "0.25rem 0.5rem",
                                      borderRadius: "0.25rem",
                                      fontSize: "0.75rem",
                                      fontWeight: "600",
                                      background:
                                        exp.status === "APPROVED"
                                          ? "#dcfce7"
                                          : exp.status === "SUBMITTED"
                                          ? "#dbeafe"
                                          : "#fef3c7",
                                      color:
                                        exp.status === "APPROVED"
                                          ? "#16a34a"
                                          : exp.status === "SUBMITTED"
                                          ? "#0369a1"
                                          : "#92400e",
                                    }}
                                  >
                                    {exp.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Review Action */}
                    {submission.status === "SUBMITTED" && (
                      <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid #e5e7eb" }}>
                        <h4 style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "0.75rem" }}>
                          Review Notes (Optional)
                        </h4>
                        <textarea
                          value={reviewNotes[submission.id] || ""}
                          onChange={(e) =>
                            setReviewNotes((prev) => ({
                              ...prev,
                              [submission.id]: e.target.value,
                            }))
                          }
                          placeholder="Add personal review notes..."
                          rows={2}
                          style={{
                            width: "100%",
                            padding: "0.75rem",
                            border: "1px solid #d1d5db",
                            borderRadius: "0.5rem",
                            fontSize: "0.875rem",
                            marginBottom: "1rem",
                            boxSizing: "border-box",
                            fontFamily: "inherit",
                          }}
                        />
                        <button
                          onClick={() => handleMarkReviewed(submission.id)}
                          style={{
                            padding: "0.75rem 1.5rem",
                            background: "#dbeafe",
                            border: "1px solid #93c5fd",
                            color: "#1d4ed8",
                            borderRadius: "0.5rem",
                            cursor: "pointer",
                            fontWeight: "600",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <CheckCircle size={18} />
                          Mark as Reviewed
                        </button>
                      </div>
                    )}
                    {submission.status === "UNDER_REVIEW" && (
                      <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{ padding: "0.75rem 1rem", background: "#dcfce7", borderRadius: "0.5rem", color: "#16a34a", fontWeight: 600, fontSize: "0.9rem", flex: 1 }}>
                          ✓ Reviewed
                        </div>
                        <button
                          onClick={() => handleMarkSettled(submission.id)}
                          style={{
                            padding: "0.75rem 1.5rem",
                            background: "#dbeafe",
                            border: "1px solid #93c5fd",
                            color: "#1d4ed8",
                            borderRadius: "0.5rem",
                            cursor: "pointer",
                            fontWeight: "600",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <CheckCircle size={18} />
                          Mark as Settled
                        </button>
                      </div>
                    )}
                    {submission.status === "REIMBURSED" && (
                      <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "#dbeafe", borderRadius: "0.5rem", color: "#1d4ed8", fontWeight: 600, fontSize: "0.9rem" }}>
                        ✓ Settled
                      </div>
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
};
