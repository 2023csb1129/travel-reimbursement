"use client";

import { useEffect, useState, useRef } from "react";
import { signOut } from "next-auth/react";

interface Profile {
  name: string; email: string; empCode?: string;
  designation?: string; department?: string;
  gradeLvl?: string; bankAccount?: string; ifscCode?: string;
}
interface Card { id: string; label: string; cardType: string; maskedNumber: string; }

const AVT = (s: string) => s.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

const pill = (label: string, val: string) => (
  <div style={{ background: "#f3f4f6", borderRadius: "2rem", padding: "0.55rem 1.1rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
    <span style={{ fontSize: "0.82rem", color: "#6b7280", fontWeight: 600 }}>{label}</span>
    <span style={{ fontSize: "0.88rem", color: "#111827", fontWeight: 600 }}>{val || "—"}</span>
  </div>
);

export function ProfilePanel({ session, onReimbursements, onTrips }: { session: any; onReimbursements: () => void; onTrips: () => void }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"menu" | "info" | "cards" | "settings">("menu");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardForm, setCardForm] = useState({ label: "", cardType: "DEBIT", number: "" });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const name = session?.user?.name || session?.user?.email || "User";
  const initials = AVT(name);

  // Fetch profile when opening info view
  useEffect(() => {
    if (open && view === "info" && !profile) {
      setLoadingProfile(true);
      fetch("/api/profile").then(r => r.json()).then(d => {
        setProfile(d.user);
        setEditForm(d.user);
      }).finally(() => setLoadingProfile(false));
    }
  }, [open, view, profile]);

  // Fetch cards when opening cards view
  useEffect(() => {
    if (open && view === "cards") {
      fetch("/api/profile/payment-cards").then(r => r.json()).then(d => setCards(d.cards || []));
    }
  }, [open, view]);

  // Close on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
    const d = await res.json();
    setProfile(d.user); setEditing(false); setSaving(false);
  };

  const addCard = async () => {
    if (!cardForm.label || !cardForm.number || cardForm.number.length < 4) return alert("Please enter card label and at least 4 digits");
    const last4 = cardForm.number.slice(-4);
    const masked = `****${last4}`;
    const res = await fetch("/api/profile/payment-cards", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardLabel: cardForm.label, cardType: cardForm.cardType, maskedNumber: masked }),
    });
    if (res.ok) {
      const d = await res.json();
      setCards(prev => [d.card, ...prev]);
      setCardForm({ label: "", cardType: "DEBIT", number: "" });
      setShowAddCard(false);
    } else {
      const e = await res.json(); alert(e.error || "Failed to add card");
    }
  };

  const deleteCard = async (id: string) => {
    if (!confirm("Delete this card?")) return;
    const res = await fetch(`/api/profile/payment-cards/${id}`, { method: "DELETE" });
    if (res.ok) setCards(prev => prev.filter(c => c.id !== id));
  };

  const inp = (placeholder: string, value: string, onChange: (v: string) => void, type = "text") => (
    <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
      style={{ width: "100%", padding: "0.6rem 0.8rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", fontSize: "0.88rem", background: "#f9fafb", boxSizing: "border-box" as any }} />
  );

  const goBack = () => { setView("menu"); setEditing(false); setShowAddCard(false); };

  const cardTypeLabel: any = { DEBIT: "Debit", CREDIT: "Credit", OTHER: "Other" };

  return (
    <div ref={panelRef} style={{ position: "relative" }}>
      {/* Avatar Button */}
      <button id="profile-avatar-btn" onClick={() => { setOpen(v => !v); setView("menu"); }}
        style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#1b5e3f,#2d7d58)", border: "2.5px solid transparent", color: "white", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.18)", outline: "none", transition: "all 0.2s" }}
        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.08)")}
        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
      >{initials}</button>

      {/* Backdrop */}
      {open && <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 999 }} />}

      {/* Panel */}
      {open && (
        <div id="profile-panel" style={{ position: "fixed", top: 0, right: 0, width: 340, height: "100vh", background: "white", zIndex: 1000, boxShadow: "-4px 0 32px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", animation: "slideInRight 0.22s cubic-bezier(.4,0,.2,1)" }}>

          {/* Header */}
          <div style={{ padding: "1rem 1.2rem", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "0.75rem", background: "linear-gradient(135deg,#1b5e3f,#2d7d58)" }}>
            {view !== "menu" && (
              <button onClick={goBack} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
            )}
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.25)", color: "white", fontWeight: 700, fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{initials}</div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <p style={{ margin: 0, fontWeight: 700, color: "white", fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</p>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(255,255,255,0.75)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session?.user?.email}</p>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>

          {/* ── MENU VIEW ── */}
          {view === "menu" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "1.5rem 1.2rem", gap: "0.75rem" }}>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>Profile Section</p>
              {[
                { icon: "👤", label: "User Info", sub: "View & edit your details", action: () => setView("info") },
                { icon: "💳", label: "My Cards", sub: "Manage payment cards", action: () => setView("cards") },
                { icon: "💰", label: "My Reimbursements", sub: "View reimbursement status", action: () => { setOpen(false); onReimbursements(); } },
                { icon: "✈️", label: "My Trips", sub: "View and manage trips", action: () => { setOpen(false); onTrips(); } },
                { icon: "⚙️", label: "Settings & FAQ", sub: "App settings and help", action: () => setView("settings") },
              ].map(item => (
                <button key={item.label} onClick={item.action} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.1rem", border: "1.5px solid #e5e7eb", borderRadius: "0.85rem", background: "white", cursor: "pointer", textAlign: "left", transition: "all 0.15s", width: "100%" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1b5e3f"; (e.currentTarget as HTMLElement).style.background = "#f0fdf4"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLElement).style.background = "white"; }}>
                  <span style={{ fontSize: "1.5rem", width: 36, height: 36, background: "#f0fdf4", borderRadius: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem", color: "#111827" }}>{item.label}</p>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#6b7280" }}>{item.sub}</p>
                  </div>
                  <span style={{ marginLeft: "auto", color: "#9ca3af", fontSize: "1.1rem" }}>›</span>
                </button>
              ))}

              <div style={{ flex: 1 }} />
              <button onClick={() => signOut({ callbackUrl: "/" })} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.75rem 1rem", border: "1.5px solid #fee2e2", borderRadius: "0.75rem", background: "#fef2f2", color: "#ef4444", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", width: "100%" }}>
                <span style={{ fontSize: "1.1rem" }}>🚪</span> Sign Out
              </button>
            </div>
          )}

          {/* ── USER INFO VIEW ── */}
          {view === "info" && (
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              {loadingProfile ? (
                <p style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Loading...</p>
              ) : profile ? (
                <>
                  {/* Name + Designation Card */}
                  <div style={{ margin: "1.2rem", padding: "1.2rem", background: "linear-gradient(135deg,#1b5e3f,#2d9c6e)", borderRadius: "1rem", color: "white", textAlign: "center" }}>
                    <p style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800 }}>{profile.name || "—"}</p>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem", opacity: 0.85 }}>{profile.designation || "—"}</p>
                  </div>

                  {!editing ? (
                    <div style={{ padding: "0 1.2rem 1.2rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                      {pill("Department", profile.department || "")}
                      {pill("Employee Code", profile.empCode || "")}
                      {pill("Grade / Level", profile.gradeLvl || "")}
                      {pill("Account No.", profile.bankAccount || "")}
                      {pill("IFSC Code", profile.ifscCode || "")}
                      {pill("Email", profile.email)}
                      <button onClick={() => setEditing(true)} style={{ marginTop: "0.5rem", alignSelf: "flex-end", padding: "0.5rem 1.4rem", background: "#1b5e3f", color: "white", border: "none", borderRadius: "2rem", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}>✏️ Edit</button>
                    </div>
                  ) : (
                    <div style={{ padding: "0 1.2rem 1.2rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                      {[
                        ["Full Name", "name"], ["Designation", "designation"], ["Department", "department"],
                        ["Employee Code", "empCode"], ["Grade / Level", "gradeLvl"],
                        ["Account No.", "bankAccount"], ["IFSC Code", "ifscCode"],
                      ].map(([label, key]) => (
                        <div key={key}>
                          <p style={{ margin: "0 0 0.25rem", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280" }}>{label}</p>
                          {inp(label, editForm[key] || "", v => setEditForm((f: any) => ({ ...f, [key]: v })))}
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                        <button onClick={saveProfile} disabled={saving} style={{ flex: 1, padding: "0.65rem", background: "#1b5e3f", color: "white", border: "none", borderRadius: "0.5rem", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "Saving..." : "Save"}</button>
                        <button onClick={() => setEditing(false)} style={{ flex: 1, padding: "0.65rem", background: "white", color: "#374151", border: "1px solid #d1d5db", borderRadius: "0.5rem", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}

          {/* ── MY CARDS VIEW ── */}
          {view === "cards" && (
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              <div style={{ flex: 1, padding: "1rem 1.2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {cards.length === 0 && !showAddCard && (
                  <p style={{ textAlign: "center", color: "#9ca3af", marginTop: "2rem" }}>No cards saved yet</p>
                )}
                {cards.map(card => (
                  <div key={card.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 1rem", border: "1.5px solid #e5e7eb", borderRadius: "0.85rem", background: "white" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ width: 40, height: 40, background: "#f0fdf4", borderRadius: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>💳</div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem", color: "#111827" }}>{card.label}</p>
                        <p style={{ margin: 0, fontSize: "0.78rem", color: "#6b7280" }}>{cardTypeLabel[card.cardType] || card.cardType} • {card.maskedNumber}</p>
                      </div>
                    </div>
                    <button onClick={() => deleteCard(card.id)} style={{ padding: "0.35rem 0.7rem", background: "#fef2f2", border: "1px solid #fee2e2", color: "#ef4444", borderRadius: "0.4rem", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>Delete</button>
                  </div>
                ))}

                {showAddCard && (
                  <div style={{ border: "1.5px solid #d1d5db", borderRadius: "0.85rem", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem", color: "#111827" }}>Add New Card</p>
                    <div>
                      <p style={{ margin: "0 0 0.2rem", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280" }}>Card Label (e.g. "My Visa")</p>
                      {inp("Label", cardForm.label, v => setCardForm(f => ({ ...f, label: v })))}
                    </div>
                    <div>
                      <p style={{ margin: "0 0 0.2rem", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280" }}>Card Type</p>
                      <select value={cardForm.cardType} onChange={e => setCardForm(f => ({ ...f, cardType: e.target.value }))}
                        style={{ width: "100%", padding: "0.6rem 0.8rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", fontSize: "0.88rem", background: "#f9fafb" }}>
                        <option value="DEBIT">Debit</option>
                        <option value="CREDIT">Credit</option>
                        <option value="OTHER">Other / UPI / Cash</option>
                      </select>
                    </div>
                    <div>
                      <p style={{ margin: "0 0 0.2rem", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280" }}>Card Number (last 4 digits used)</p>
                      {inp("Card number", cardForm.number, v => setCardForm(f => ({ ...f, number: v })), "number")}
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button onClick={addCard} style={{ flex: 1, padding: "0.6rem", background: "#1b5e3f", color: "white", border: "none", borderRadius: "0.5rem", fontWeight: 700, cursor: "pointer" }}>Add</button>
                      <button onClick={() => setShowAddCard(false)} style={{ flex: 1, padding: "0.6rem", background: "white", color: "#374151", border: "1px solid #d1d5db", borderRadius: "0.5rem", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              {!showAddCard && (
                <div style={{ padding: "1rem 1.2rem", borderTop: "1px solid #e5e7eb" }}>
                  <button onClick={() => setShowAddCard(true)} style={{ width: "100%", padding: "0.7rem", background: "#1b5e3f", color: "white", border: "none", borderRadius: "0.75rem", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}>➕ Add Card</button>
                  <p style={{ margin: "0.5rem 0 0", textAlign: "center", fontSize: "0.72rem", color: "#9ca3af" }}>Click Delete to remove a card</p>
                </div>
              )}
            </div>
          )}

          {/* ── SETTINGS & FAQ VIEW ── */}
          {view === "settings" && (
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", padding: "1.2rem" }}>


              <div>
                <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", color: "#1a3a2e" }}>Frequently Asked Questions</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {[
                    {
                      q: "Who has developed this project?",
                      a: "This application has been developed by students of IIT Ropar as part of the Development Engineering project under the guidance of Dr Puneet Goyal (contributors- Keerthi, Dhruv)."
                    },
                    {
                      q: "Where to access my cards?",
                      a: "You can access your saved cards from the 'My Cards' option in the profile menu."
                    },
                    {
                      q: "How to change my profile?",
                      a: "Click on 'User Info' in the profile menu and click the 'Edit' button to change your details like name, account, etc."
                    },
                    {
                      q: "How to Sort/Filter Trips?",
                      a: "On the Trips Dashboard, use the tabs below the title to filter by Active Trips, Wishlist (⭐), or Archived (📦) trips."
                    },
                    {
                      q: "How to add a Trip?",
                      a: "Click the '+ New Trip' button on the top right of the Trips Dashboard."
                    },
                    {
                      q: "How to Delete a Trip?",
                      a: "Currently, you can Archive a trip to hide it from your active view. Full deletion capabilities will be available in a future update."
                    },
                    {
                      q: "How to edit Trip Details?",
                      a: "Open the trip by clicking 'View Details' and manage its associated expenses. Editing the trip metadata itself will be added soon."
                    },
                    {
                      q: "How to Archive Trip & View Archives?",
                      a: "Click the 📥 icon on the right side of any trip to archive it. You can view archived trips by clicking the 'Archived' tab at the top of the Trips Dashboard."
                    },
                    {
                      q: "How to mark your favourite trip?",
                      a: "Click the ⭐ star icon next to the trip's title to add it to your Wishlist."
                    }
                  ].map((faq, i) => (
                    <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", overflow: "hidden" }}>
                      <button 
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        style={{ width: "100%", padding: "0.75rem", background: openFaq === i ? "#f0fdf4" : "white", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", textAlign: "left", fontSize: "0.85rem", fontWeight: 600, color: "#1f2937" }}
                      >
                        {faq.q}
                        <span style={{ transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
                      </button>
                      {openFaq === i && (
                        <div style={{ padding: "0.75rem", background: "white", borderTop: "1px solid #e5e7eb", fontSize: "0.8rem", color: "#4b5563", lineHeight: 1.5 }}>
                          {faq.a}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
