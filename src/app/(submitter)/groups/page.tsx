"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Group {
  id: string;
  groupId: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export default function UserGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinGroupId, setJoinGroupId] = useState("");
  const [joinSecretKey, setJoinSecretKey] = useState("");
  const [joining, setJoining] = useState(false);

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

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinGroupId || !joinSecretKey) return;

    setJoining(true);
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: joinGroupId, secretKey: joinSecretKey }),
      });

      const data = await res.json();

      if (res.ok) {
        setJoinGroupId("");
        setJoinSecretKey("");
        setIsJoinModalOpen(false);
        fetchGroups();
      } else {
        alert(data.error || "Failed to join group");
      }
    } catch (error) {
      console.error("Join group error", error);
      alert("Failed to join group");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div style={{ padding: "3rem", maxWidth: "1200px", margin: "0 auto" }}>

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
          <h3 style={{ fontSize: "1.25rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>Not in any groups</h3>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>You haven't joined any groups yet. Ask a Reimbursifier for a Group ID and Secret Key.</p>
          <button
            onClick={() => setIsJoinModalOpen(true)}
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
            Join a Group Now
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "2rem" }}>
          {groups.map(group => (
            <div key={group.id} onClick={() => window.location.href = `/groups/${group.id}`} style={{ 
              background: "white", 
              borderRadius: "1rem", 
              padding: "2rem",
              boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
              border: "1px solid rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.05)"; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                  {group.name}
                </h3>
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
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>Group ID</span>
                  <code style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: "700" }}>{group.groupId}</code>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Join Modal */}
      {isJoinModalOpen && (
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
              Join Group
            </h2>
            <form onSubmit={handleJoinGroup}>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                  Group ID
                </label>
                <input
                  type="text"
                  required
                  value={joinGroupId}
                  onChange={(e) => setJoinGroupId(e.target.value)}
                  placeholder="e.g. GRP-XYZ123"
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
                  Secret Key
                </label>
                <input
                  type="text"
                  required
                  value={joinSecretKey}
                  onChange={(e) => setJoinSecretKey(e.target.value)}
                  placeholder="e.g. SEC-ABC45678"
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
              
              <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
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
                  disabled={joining || !joinGroupId || !joinSecretKey}
                  style={{
                    padding: "0.75rem 1.5rem",
                    borderRadius: "0.5rem",
                    border: "none",
                    background: "linear-gradient(135deg, #1b5e3f 0%, #2d7d5a 100%)",
                    color: "white",
                    fontWeight: "600",
                    cursor: joining || !joinGroupId || !joinSecretKey ? "not-allowed" : "pointer",
                    opacity: joining || !joinGroupId || !joinSecretKey ? 0.7 : 1
                  }}
                >
                  {joining ? "Joining..." : "Join Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
