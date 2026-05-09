"use client";

import { useRef } from "react";
import { TripsDashboard } from "@/components/trips-dashboard";

export default function TripsPage() {
  const tripsDashboardRef = useRef<any>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "1rem", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>

      {/* Main Dashboard */}
      <div style={{ background: "white", borderRadius: "1rem", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", overflow: "hidden", flex: 1, border: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
        <TripsDashboard ref={tripsDashboardRef} />
      </div>
    </div>
  );
}
