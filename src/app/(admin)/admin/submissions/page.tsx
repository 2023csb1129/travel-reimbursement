"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AdminApprovalPanel } from "@/components/admin-approval-panel";

export default function SubmissionsDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      if (session?.user?.role === "ADMINISTRATOR") {
        setIsAuthorized(true);
      } else {
        router.push("/trips");
      }
    }
  }, [status, session, router]);

  if (!isAuthorized) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)" }}>Checking authorization...</p>
      </div>
    );
  }

  return <AdminApprovalPanel />;
}
