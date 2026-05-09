"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface FieldValue {
  fieldId: string;
  value: string | number | boolean | string[];
  field: {
    id: string;
    label: string;
    type: string;
  };
}

interface Submission {
  id: string;
  status: string;
  user: { id: string; email: string; name: string };
  trip: { id: string; title: string };
  template: { id: string; version: number };
  fieldValues: FieldValue[];
  reviewNotes: string;
  createdAt: string;
  updatedAt: string;
}

export default function SubmissionDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const submissionId = (params?.id as string) ?? "";

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");

  // Redirect if not admin
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && session?.user?.role !== "ADMINISTRATOR") {
      router.push("/trips");
    }
  }, [status, session, router]);

  // Fetch submission
  useEffect(() => {
    if (!submissionId || !session?.user?.id) return;

    const fetchSubmission = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/submissions/${submissionId}`);
        if (!response.ok) throw new Error("Failed to fetch submission");

        const data = await response.json();
        setSubmission(data.submission);
        setReviewNotes(data.submission.reviewNotes || "");
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchSubmission();
  }, [submissionId, session?.user?.id]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!submission) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, reviewNotes: reviewNotes }),
      });

      if (!response.ok) throw new Error("Failed to update submission");

      const data = await response.json();
      setSubmission(data.submission);
      alert("Submission updated successfully");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update submission");
    } finally {
      setUpdating(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (!session || session.user?.role !== "ADMINISTRATOR") {
    return null;
  }

  if (error || !submission) {
    return (
      <main style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--text-primary)" }}>
            Submission Details
          </h1>
          <Link
            href="/admin/submissions"
            style={{
              padding: "0.75rem 1.5rem",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              textDecoration: "none",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            ← Back to Submissions
          </Link>
        </div>
        <div
          style={{
            padding: "1rem",
            background: "#fee",
            border: "1px solid #fcc",
            borderRadius: "0.5rem",
            color: "#c33",
          }}
        >
          Error: {error || "Submission not found"}
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--text-primary)", margin: 0 }}>
          Submission Details
        </h1>
        <Link
          href="/admin/submissions"
          style={{
            padding: "0.75rem 1.5rem",
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            textDecoration: "none",
            fontWeight: "500",
            cursor: "pointer",
          }}
        >
          ← Back to Submissions
        </Link>
      </div>

      {/* Info Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1.5rem" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>Trip</p>
          <p style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--text-primary)", margin: 0 }}>
            {submission.trip.title}
          </p>
        </div>
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1.5rem" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>Submitter</p>
          <p style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--text-primary)", margin: 0 }}>
            {submission.user.name || submission.user.email}
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
            {submission.user.email}
          </p>
        </div>
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1.5rem" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>Created</p>
          <p style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--text-primary)", margin: 0 }}>
            {new Date(submission.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Form Data */}
      {submission.fieldValues.length > 0 && (
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1.5rem", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "var(--text-primary)", marginTop: 0 }}>
            Submission Data
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
            {submission.fieldValues.map((fv) => (
              <div key={fv.fieldId}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                  {fv.field.label}
                </label>
                <div style={{
                  padding: "0.75rem",
                  background: "var(--bg-primary)",
                  borderRadius: "0.4rem",
                  color: "var(--text-primary)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}>
                  {Array.isArray(fv.value) ? fv.value.join(", ") : String(fv.value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status & Notes */}
      <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1.5rem", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "var(--text-primary)", marginTop: 0 }}>
          Status & Notes
        </h2>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            Status
          </label>
          <select
            value={submission.status}
            onChange={(e) => setSubmission({ ...submission, status: e.target.value })}
            style={{
              padding: "0.75rem",
              border: "1px solid var(--border)",
              borderRadius: "0.4rem",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            Admin Notes
          </label>
          <textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Add review notes for this submission..."
            style={{
              width: "100%",
              padding: "0.75rem",
              minHeight: "120px",
              border: "1px solid var(--border)",
              borderRadius: "0.4rem",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontFamily: "inherit",
              fontSize: "0.95rem",
              resize: "vertical",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={() => handleStatusUpdate(submission.status)}
            disabled={updating}
            style={{
              padding: "0.75rem 1.5rem",
              background: "var(--primary)",
              color: "white",
              border: "none",
              borderRadius: "0.4rem",
              cursor: updating ? "not-allowed" : "pointer",
              fontWeight: "600",
              opacity: updating ? 0.6 : 1,
            }}
          >
            {updating ? "Updating..." : "Save Changes"}
          </button>
        </div>
      </div>
    </main>
  );
}
