"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Badge, Loader, Info } from "lucide-react";

interface Submission {
  id: string;
  templateId: string;
  tripId: string;
  userId: string;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "REIMBURSED";
  submissionDate: string | null;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
  template?: {
    title: string;
  };
  trip?: {
    title: string;
  };
}

interface SubmissionTrackingProps {
  tripId?: string;
}

const statusConfig = {
  DRAFT: { color: "bg-gray-100 text-gray-800", label: "Draft", icon: "📝" },
  SUBMITTED: { color: "bg-blue-100 text-blue-800", label: "Submitted", icon: "📤" },
  UNDER_REVIEW: { color: "bg-yellow-100 text-yellow-800", label: "Under Review", icon: "🔍" },
  APPROVED: { color: "bg-green-100 text-green-800", label: "Approved", icon: "✅" },
  REJECTED: { color: "bg-red-100 text-red-800", label: "Rejected", icon: "❌" },
  REIMBURSED: { color: "bg-purple-100 text-purple-800", label: "Reimbursed", icon: "💰" },
};

export function SubmissionTracking({ tripId }: SubmissionTrackingProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    fetchSubmissions();
  }, [tripId]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const url = tripId ? `/api/submissions?tripId=${tripId}` : "/api/submissions";
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch submissions");
      }

      const data = await response.json();
      setSubmissions(data.submissions || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader className="animate-spin" size={20} />
          <span>Loading submissions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <div className="flex gap-2">
          <Info size={20} className="text-red-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-800">Error Loading Submissions</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const filteredSubmissions = submissions.filter((sub) => {
    if (statusFilter !== "ALL" && sub.status !== statusFilter) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const templateTitle = (sub.template?.title || sub.templateId || "").toLowerCase();
      const tripTitle = (sub.trip?.title || "").toLowerCase();
      return templateTitle.includes(term) || tripTitle.includes(term);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Submission Tracking</h2>
        <div className="text-sm text-gray-600">
          {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="flex gap-4 flex-col sm:flex-row">
        <input
          type="text"
          placeholder="Search by form name or trip..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">All Statuses</option>
          {Object.entries(statusConfig).map(([status, config]) => (
            <option key={status} value={status}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      {filteredSubmissions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded">
          <Badge size={40} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">No submissions found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Timeline View */}
          <div className="space-y-3">
            {filteredSubmissions.map((submission, index) => {
              const config = statusConfig[submission.status];
              const isSelected = selectedSubmission?.id === submission.id;

              return (
                <div
                  key={submission.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedSubmission(isSelected ? null : submission)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{config.icon}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {submission.template?.title || submission.templateId}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {submission.trip?.title || "Unknown Trip"}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Submitted{" "}
                        {submission.submissionDate
                          ? new Date(submission.submissionDate).toLocaleString()
                          : "Not submitted yet"}
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
                      {config.label}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Submission ID:</span>
                          <p className="font-mono text-xs mt-1 p-2 bg-gray-100 rounded">
                            {submission.id}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Created:</span>
                          <p className="mt-1">
                            {new Date(submission.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {submission.reviewNotes && (
                        <div>
                          <span className="text-gray-600 text-sm">Review Notes:</span>
                          <p className="mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                            {submission.reviewNotes}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <button className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                          View Details
                        </button>
                        {submission.status === "DRAFT" && (
                          <button className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                            Submit
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Status Summary */}
          <div className="mt-8 p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-3">Status Summary</h3>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {Object.entries(statusConfig).map(([status, config]) => {
                const count = submissions.filter((s) => s.status === status).length;
                return (
                  <div key={status} className="text-center">
                    <div className={`inline-block px-2 py-1 rounded text-xs font-medium mb-1 ${config.color}`}>
                      {config.label}
                    </div>
                    <div className="text-lg font-semibold text-gray-900">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
