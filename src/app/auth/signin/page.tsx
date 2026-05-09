"use client";

import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Header } from "@/components/header";

function SignInContent() {
  const searchParams = useSearchParams();
  const initialMode = searchParams?.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);

  const handleModeSwitch = (newMode: "signin" | "signup") => {
    setMode(newMode);
    window.history.replaceState(null, '', newMode === "signup" ? "?mode=signup" : window.location.pathname);
  };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userRole, setUserRole] = useState<"USER" | "ADMINISTRATOR">("USER");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error || "Sign in failed");
      } else if (result?.ok) {
        const session = await getSession();
        if (session?.user?.role === "ADMINISTRATOR") {
          router.push("/admin/groups");
        } else {
          router.push("/trips");
        }
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      // First, create the account with role
      const signupResponse = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.toLowerCase().trim(), 
          password,
          role: userRole,
        }),
      });

      if (!signupResponse.ok) {
        const data = await signupResponse.json();
        throw new Error(data.error || "Sign up failed");
      }

      // Then sign in
      const result = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error || "Sign up failed");
      } else if (result?.ok) {
        if (userRole === "ADMINISTRATOR") {
          router.push("/admin/groups");
        } else {
          router.push("/trips");
        }
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#fafbfa",
      }}
    >
      <Header title="Sign In" showAuthButtons={false} />
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          maxWidth: mode === "signup" ? "1400px" : "1000px",
          minHeight: "600px",
          background: "white",
          borderRadius: "1.25rem",
          boxShadow: "0 20px 60px rgba(109, 40, 217, 0.15)",
          overflow: "hidden",
          transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Left Side: Branding */}
        <div
          style={{
            flex: 1,
            background: "linear-gradient(135deg, #1b5e3f 0%, #2d7d5a 100%)",
            padding: "3rem 3rem 7rem 3rem", // Added more bottom padding to push content up
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            color: "white",
          }}
        >
          <div style={{ fontSize: "5rem", marginBottom: "1.5rem" }}>💎</div>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "900", margin: "0 0 1rem", letterSpacing: "-0.5px" }}>
            Reimbursify
          </h1>
          <p style={{ color: "rgba(255,255,255,0.95)", fontSize: "1.1rem", margin: 0, fontWeight: "600" }}>
            Expense Management Platform
          </p>
        </div>

        {/* Right Side: Form Content */}
        <div style={{ flex: 1, padding: "3rem 2.5rem", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", background: "var(--primary-lightest)", padding: "0.25rem", borderRadius: "0.75rem", border: "1px solid var(--primary-lighter)" }}>
            <button
              onClick={() => handleModeSwitch("signin")}
              style={{
                flex: 1,
                padding: "0.75rem",
                fontSize: "0.9rem",
                fontWeight: "700",
                background: mode === "signin" ? "white" : "transparent",
                color: mode === "signin" ? "var(--primary)" : "var(--text-muted)",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
                transition: "all 0.2s",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                boxShadow: mode === "signin" ? "0 2px 8px rgba(109, 40, 217, 0.1)" : "none",
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => handleModeSwitch("signup")}
              style={{
                flex: 1,
                padding: "0.75rem",
                fontSize: "0.9rem",
                fontWeight: "700",
                background: mode === "signup" ? "white" : "transparent",
                color: mode === "signup" ? "var(--primary)" : "var(--text-muted)",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
                transition: "all 0.2s",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                boxShadow: mode === "signup" ? "0 2px 8px rgba(109, 40, 217, 0.1)" : "none",
              }}
            >
              Create
            </button>
          </div>


          {/* Error message */}
          {error && (
            <div
              style={{
                padding: "0.875rem 1rem",
                background: "#fee2e2",
                color: "#991b1b",
                borderRadius: "0.75rem",
                fontSize: "0.875rem",
                marginBottom: "1.5rem",
                fontWeight: "600",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "0.625rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Username
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your username"
                style={{
                  width: "100%",
                  padding: "0.875rem 1rem",
                  fontSize: "0.95rem",
                  border: "2px solid #e9d5ff",
                  borderRadius: "0.75rem",
                  background: "#fafbff",
                  color: "var(--text-primary)",
                  fontWeight: "600",
                  transition: "all 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--primary)";
                  e.target.style.background = "white";
                  e.target.style.boxShadow = "0 0 0 3px rgba(109, 40, 217, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e9d5ff";
                  e.target.style.background = "#fafbff";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <div style={{ marginBottom: mode === "signin" ? "1.5rem" : "1rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "0.625rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signin" ? "Enter your password" : "At least 6 characters"}
                style={{
                  width: "100%",
                  padding: "0.875rem 1rem",
                  fontSize: "0.95rem",
                  border: "2px solid #e9d5ff",
                  borderRadius: "0.75rem",
                  background: "#fafbff",
                  color: "var(--text-primary)",
                  fontWeight: "600",
                  transition: "all 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--primary)";
                  e.target.style.background = "white";
                  e.target.style.boxShadow = "0 0 0 3px rgba(109, 40, 217, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e9d5ff";
                  e.target.style.background = "#fafbff";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <div 
              style={{ 
                display: "grid", 
                gridTemplateRows: mode === "signup" ? "1fr" : "0fr", 
                transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                opacity: mode === "signup" ? 1 : 0,
              }}
            >
              <div style={{ overflow: "hidden" }}>
                <div style={{ paddingBottom: "1.5rem" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "0.625rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    style={{
                      width: "100%",
                      padding: "0.875rem 1rem",
                      fontSize: "0.95rem",
                      border: "2px solid #e9d5ff",
                      borderRadius: "0.75rem",
                      background: "#fafbff",
                      color: "var(--text-primary)",
                      fontWeight: "600",
                      transition: "all 0.2s",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--primary)";
                      e.target.style.background = "white";
                      e.target.style.boxShadow = "0 0 0 3px rgba(109, 40, 217, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e9d5ff";
                      e.target.style.background = "#fafbff";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>
              </div>
            </div>


            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "1.125rem",
                fontSize: "0.95rem",
                fontWeight: "800",
                background: isLoading ? "#d4d4d8" : "linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%)",
                color: "white",
                border: "none",
                borderRadius: "0.75rem",
                cursor: isLoading ? "not-allowed" : "pointer",
                transition: "all 0.3s",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                boxShadow: "0 4px 15px rgba(109, 40, 217, 0.3)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 25px rgba(109, 40, 217, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 15px rgba(109, 40, 217, 0.3)";
              }}
            >
              <div style={{ display: "grid", placeItems: "center", width: "100%" }}>
                <span style={{ 
                  gridArea: "1 / 1", 
                  opacity: isLoading ? 1 : 0, 
                  transition: "all 0.3s ease",
                  transform: isLoading ? "translateY(0)" : "translateY(-10px)",
                  pointerEvents: "none"
                }}>
                  Loading...
                </span>
                <span style={{ 
                  gridArea: "1 / 1", 
                  opacity: (!isLoading && mode === "signin") ? 1 : 0, 
                  transition: "all 0.3s ease",
                  transform: (!isLoading && mode === "signin") ? "translateY(0)" : ((!isLoading && mode === "signup") ? "translateY(10px)" : "translateY(10px)"),
                  pointerEvents: "none"
                }}>
                  Sign In
                </span>
                <span style={{ 
                  gridArea: "1 / 1", 
                  opacity: (!isLoading && mode === "signup") ? 1 : 0, 
                  transition: "all 0.3s ease",
                  transform: (!isLoading && mode === "signup") ? "translateY(0)" : "translateY(-10px)",
                  pointerEvents: "none"
                }}>
                  Create Account
                </span>
              </div>
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", margin: "1.5rem 0" }}>
            <div style={{ flex: 1, height: "1px", background: "#e9d5ff" }}></div>
            <span style={{ padding: "0 1rem", fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase" }}>Or continue with Google</span>
            <div style={{ flex: 1, height: "1px", background: "#e9d5ff" }}></div>
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={() => {
              document.cookie = `auth_mode=${mode}; path=/; max-age=3600`;
              document.cookie = `google_signup_role=${userRole}; path=/; max-age=3600`;
              signIn("google", { callbackUrl: "/" });
            }}
            style={{
              width: "100%",
              padding: "0.875rem 1rem",
              fontSize: "0.95rem",
              fontWeight: "700",
              background: "white",
              color: "var(--text-primary)",
              border: "2px solid #e9d5ff",
              borderRadius: "0.75rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.75rem",
              transition: "all 0.2s",
              boxShadow: "0 2px 8px rgba(109, 40, 217, 0.05)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--primary)";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(109, 40, 217, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#e9d5ff";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(109, 40, 217, 0.05)";
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" style={{ zIndex: 1 }}>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <div style={{ display: "grid", placeItems: "center" }}>
              <span style={{ 
                gridArea: "1 / 1", 
                opacity: mode === "signin" ? 1 : 0, 
                transition: "all 0.3s ease",
                transform: mode === "signin" ? "translateY(0)" : "translateY(10px)",
                pointerEvents: "none"
              }}>
                Sign in with Google
              </span>
              <span style={{ 
                gridArea: "1 / 1", 
                opacity: mode === "signup" ? 1 : 0, 
                transition: "all 0.3s ease",
                transform: mode === "signup" ? "translateY(0)" : "translateY(-10px)",
                pointerEvents: "none"
              }}>
                Create account with Google
              </span>
            </div>
          </button>
        </div>

        {/* Third Side: Register As Content */}
        <div style={{ 
          flex: mode === "signup" ? 1 : 0, 
          width: mode === "signup" ? "auto" : "0px",
          padding: "0", 
          opacity: mode === "signup" ? 1 : 0,
          display: "flex", 
          flexDirection: "column", 
          justifyContent: "center", 
          borderLeft: mode === "signup" ? "1px solid #e9d5ff" : "none", 
          background: "#f8fafc",
          overflow: "hidden",
          transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          whiteSpace: "nowrap"
        }}>
          <div style={{ opacity: mode === "signup" ? 1 : 0, transition: "opacity 0.4s ease 0.1s", pointerEvents: mode === "signup" ? "auto" : "none", minWidth: "300px", display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
            <div style={{
              background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
              padding: "4rem 2.5rem 3rem 2.5rem",
              color: "white",
              textAlign: "center",
              boxShadow: "0 10px 25px rgba(3, 105, 161, 0.15)"
            }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>👥</div>
              <h3 style={{ fontSize: "1.5rem", fontWeight: "900", margin: "0", letterSpacing: "0.5px" }}>
                Choose Your Role
              </h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem 2.5rem 5rem 2.5rem", flex: 1, justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => setUserRole("USER")}
                style={{
                  padding: "1.5rem",
                  border: userRole === "USER" ? "3px solid var(--primary)" : "2px solid #e9d5ff",
                  borderRadius: "0.75rem",
                  background: userRole === "USER" ? "rgba(109, 40, 217, 0.1)" : "white",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontWeight: "700",
                  fontSize: "1rem",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  textAlign: "left"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(109, 40, 217, 0.05)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = userRole === "USER" ? "rgba(109, 40, 217, 0.1)" : "white";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ fontSize: "2rem" }}>👤</div>
                <div>
                  <div style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>User</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Submit expense reports</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setUserRole("ADMINISTRATOR")}
                style={{
                  padding: "1.5rem",
                  border: userRole === "ADMINISTRATOR" ? "3px solid var(--primary)" : "2px solid #e9d5ff",
                  borderRadius: "0.75rem",
                  background: userRole === "ADMINISTRATOR" ? "rgba(109, 40, 217, 0.1)" : "white",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontWeight: "700",
                  fontSize: "1rem",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  textAlign: "left"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(109, 40, 217, 0.05)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = userRole === "ADMINISTRATOR" ? "rgba(109, 40, 217, 0.1)" : "white";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ fontSize: "2rem" }}>👔</div>
                <div>
                  <div style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>Reimbursifier</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Manage and approve reimbursements</div>
                </div>
              </button>
            </div>
            {/* Bottom Boundary Bar */}
            <div style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "4rem",
              background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
            }}></div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#fafbfa" }}></div>}>
      <SignInContent />
    </Suspense>
  );
}
