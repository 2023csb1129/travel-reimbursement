"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Group {
  id: string;
  groupId: string;
  secretKey: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count?: {
    members: number;
  };
}

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups);
      }
    } catch (error) {
      console.error("Failed to fetch groups", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName, description: newGroupDesc }),
      });

      if (res.ok) {
        setNewGroupName("");
        setNewGroupDesc("");
        setIsModalOpen(false);
        fetchGroups();
      } else {
        alert("Failed to create group");
      }
    } catch (error) {
      console.error("Failed to create group", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: "3rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            Manage Groups
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
            Create and manage groups. Share the Group ID and Secret Key with users to let them join.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            background: "linear-gradient(135deg, #1b5e3f 0%, #2d7d5a 100%)",
            color: "white",
            padding: "0.75rem 1.5rem",
            borderRadius: "0.5rem",
            border: "none",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(27, 94, 63, 0.2)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          <span>➕</span> Create New Group
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>Loading groups...</div>
      ) : groups.length === 0 ? (
        <div style={{ 
          background: "white", 
          padding: "4rem 2rem", 
          borderRadius: "1rem", 
          textAlign: "center",
          border: "1px dashed var(--border)",
          boxShadow: "0 4px 6px rgba(0,0,0,0.02)"
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏢</div>
          <h3 style={{ fontSize: "1.25rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>No Groups Yet</h3>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>You haven't created any groups.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              background: "white",
              color: "#1b5e3f",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #1b5e3f",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            Create Your First Group
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "2rem" }}>
          {groups.map(group => (
            <div key={group.id} style={{ 
              background: "white", 
              borderRadius: "1rem", 
              padding: "2rem",
              boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
              border: "1px solid rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                  {group.name}
                </h3>
                <span style={{ 
                  background: "var(--bg-secondary)", 
                  padding: "0.25rem 0.75rem", 
                  borderRadius: "2rem", 
                  fontSize: "0.8rem", 
                  fontWeight: "600",
                  color: "var(--text-secondary)"
                }}>
                  👥 {group._count?.members || 1} Members
                </span>
              </div>
              
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem", flex: 1 }}>
                {group.description || "No description provided."}
              </p>

              <div style={{ 
                background: "#f8fafc", 
                padding: "1rem", 
                borderRadius: "0.75rem",
                border: "1px solid #e2e8f0"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>Group ID</span>
                  <code style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: "700" }}>{group.groupId}</code>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>Secret Key</span>
                  <code style={{ fontSize: "0.85rem", color: "#e11d48", fontWeight: "700" }}>{group.secretKey}</code>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          backdropFilter: "blur(4px)"
        }}>
          <div style={{
            background: "white",
            padding: "2.5rem",
            borderRadius: "1rem",
            width: "100%",
            maxWidth: "500px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
          }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem", color: "var(--text-primary)" }}>
              Create New Group
            </h2>
            <form onSubmit={handleCreateGroup}>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Sales Team Q3"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: "1px solid var(--border)",
                    fontSize: "1rem",
                    background: "var(--bg-primary)"
                  }}
                />
              </div>
              <div style={{ marginBottom: "2rem" }}>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                  Description (Optional)
                </label>
                <textarea
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Brief description of this group..."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: "1px solid var(--border)",
                    fontSize: "1rem",
                    resize: "none",
                    background: "var(--bg-primary)"
                  }}
                />
              </div>
              
              <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: "0.75rem 1.5rem",
                    borderRadius: "0.5rem",
                    border: "1px solid var(--border)",
                    background: "white",
                    fontWeight: "600",
                    cursor: "pointer",
                    color: "var(--text-secondary)"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newGroupName.trim()}
                  style={{
                    padding: "0.75rem 1.5rem",
                    borderRadius: "0.5rem",
                    border: "none",
                    background: "linear-gradient(135deg, #1b5e3f 0%, #2d7d5a 100%)",
                    color: "white",
                    fontWeight: "600",
                    cursor: submitting || !newGroupName.trim() ? "not-allowed" : "pointer",
                    opacity: submitting || !newGroupName.trim() ? 0.7 : 1
                  }}
                >
                  {submitting ? "Creating..." : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
