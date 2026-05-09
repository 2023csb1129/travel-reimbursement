"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { signIn } from "next-auth/react";

export default function SetupUsernamePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const email = searchParams?.get("email") || "";
  const name = searchParams?.get("name") || "";
  const defaultUsername = searchParams?.get("username") || "";
  const image = searchParams?.get("image") || "";

  const [username, setUsername] = useState(defaultUsername);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      router.push("/auth/signin");
    }
  }, [email, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/oauth-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, image, username }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to setup username");
      }

      // Successfully created account. Now trigger signin again to log them in!
      await signIn("google", { callbackUrl: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fafbfa" }}>
      <Header title="Complete Profile" showAuthButtons={false} />
      
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ 
          background: "white", 
          padding: "3rem", 
          borderRadius: "1rem", 
          boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
          maxWidth: "500px",
          width: "100%",
          textAlign: "center"
        }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--primary)", marginBottom: "1rem" }}>
            Choose your Username
          </h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
            You're signing up with <strong>{email}</strong>. Please pick a unique username to be identified in messages and groups.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem", textAlign: "left" }}>
            {error && (
              <div style={{ padding: "0.75rem", background: "#fef2f2", color: "#ef4444", borderRadius: "0.5rem", fontSize: "0.875rem" }}>
                {error}
              </div>
            )}
            
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                required
                style={{
                  width: "100%",
                  padding: "0.875rem 1rem",
                  borderRadius: "0.5rem",
                  border: "1px solid var(--border)",
                  fontSize: "1rem",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                placeholder="e.g. johndoe123"
              />
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                Only lowercase letters, numbers, and underscores are allowed.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "1rem",
                background: "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.7 : 1,
                marginTop: "1rem"
              }}
            >
              {isLoading ? "Creating Account..." : "Confirm & Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
