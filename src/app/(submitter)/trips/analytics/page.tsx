"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plane, Calendar, CheckCircle2, DollarSign, FileCheck, Clock, PieChart, BarChart } from "lucide-react";

interface DashboardStats {
  totalTrips: number;
  completedTrips: number;
  ongoingTrips: number;
  totalExpenses: number;
  totalAmount: number;
  approvedAmount: number;
  pendingAmount: number;
  categoryBreakdown: { category: string; amount: number; count: number }[];
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        // Fetch all trips to calculate stats
        const tripsResponse = await fetch("/api/trips?archived=false");
        if (!tripsResponse.ok) throw new Error("Failed to fetch trips");

        const tripsData = await tripsResponse.json();
        const trips = tripsData.trips || [];

        // Calculate statistics
        const completedTrips = trips.filter((t: any) => t.isCompleted).length;
        const ongoingTrips = trips.filter((t: any) => !t.isCompleted).length;

        let totalExpenses = 0;
        let totalAmount = 0;
        const categoryBreakdown: { [key: string]: { amount: number; count: number } } = {};

        trips.forEach((trip: any) => {
          if (trip.expenses) {
            trip.expenses.forEach((exp: any) => {
              totalExpenses++;
              totalAmount += exp.amount;

              if (!categoryBreakdown[exp.category]) {
                categoryBreakdown[exp.category] = { amount: 0, count: 0 };
              }
              categoryBreakdown[exp.category].amount += exp.amount;
              categoryBreakdown[exp.category].count++;
            });
          }
        });

        setStats({
          totalTrips: trips.length,
          completedTrips,
          ongoingTrips,
          totalExpenses,
          totalAmount,
          approvedAmount: totalAmount * 0.8, // Mock: 80% approved
          pendingAmount: totalAmount * 0.2, // Mock: 20% pending
          categoryBreakdown: Object.entries(categoryBreakdown).map(([category, data]) => ({
            category,
            amount: data.amount,
            count: data.count,
          })),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [session?.user?.id]);

  if (status === "loading" || loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading dashboard...</div>;
  }

  if (!session) {
    return null;
  }

  const displayError = error ? (
    <div
      style={{
        padding: "1rem",
        background: "#fee",
        border: "1px solid #fcc",
        borderRadius: "0.5rem",
        color: "#c33",
        marginBottom: "1rem",
      }}
    >
      {error}
    </div>
  ) : null;

  if (!stats) {
    return (
      <main style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
        {displayError}
        <p style={{ textAlign: "center", color: "var(--text-muted)" }}>No data available yet</p>
      </main>
    );
  }

  const StatCard = ({ label, value, unit = "", colorClass = "bg-blue-500", icon: Icon }: any) => (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-center animate-fade-in-up">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 ${colorClass} shadow-sm`}>
        {Icon && <Icon size={24} />}
      </div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-3xl font-bold text-gray-900">
        {value}{unit}
      </p>
    </div>
  );

  return (
    <main className="p-4 md:p-8 max-w-6xl mx-auto h-[calc(100vh-64px)] overflow-y-auto bg-gray-50/50">
      {/* Dashboard Welcome header removed per request */}

      {displayError}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Trips" value={stats.totalTrips} icon={Plane} colorClass="bg-blue-500" />
        <StatCard label="Ongoing Trips" value={stats.ongoingTrips} icon={Calendar} colorClass="bg-purple-500" />
        <StatCard label="Completed Trips" value={stats.completedTrips} icon={CheckCircle2} colorClass="bg-teal-500" />
        <StatCard label="Total Expenses" value={stats.totalExpenses} icon={DollarSign} colorClass="bg-orange-500" />
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-fade-in-up delay-1">
          <p className="text-sm font-semibold text-gray-500 mb-1">
            Total Amount
          </p>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            ₹{stats.totalAmount.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">
            Across all expenses
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-fade-in-up delay-2">
          <p className="text-sm font-semibold text-gray-500 mb-1">
            Approved
          </p>
          <p className="text-3xl font-bold text-green-600 mb-1">
            ₹{stats.approvedAmount.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">
            Ready for reimbursement
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-fade-in-up delay-3">
          <p className="text-sm font-semibold text-gray-500 mb-1">
            Pending
          </p>
          <p className="text-3xl font-bold text-amber-500 mb-1">
            ₹{stats.pendingAmount.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">
            Under review
          </p>
        </div>
      </div>

      {/* Category Breakdown */}
      {stats.categoryBreakdown && stats.categoryBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm mb-8 animate-fade-in-up delay-4">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <PieChart className="text-[var(--primary)]" size={24} />
            Expenses by Category
          </h2>

          <div className="space-y-4">
            {stats.categoryBreakdown.map((item) => (
              <div key={item.category}>
                <div className="flex justify-between items-end mb-1.5">
                  <span className="font-semibold text-gray-800">{item.category}</span>
                  <span className="text-gray-500 text-sm">
                    {item.count} {item.count === 1 ? 'expense' : 'expenses'}
                  </span>
                </div>
                <div className="bg-gray-100 rounded-full h-4 overflow-hidden flex">
                  <div
                    className="bg-[image:var(--gradient-primary)] h-full transition-all duration-1000 ease-out flex items-center justify-end px-2 text-white text-[10px] font-bold"
                    style={{ width: `${Math.max((item.amount / stats.totalAmount) * 100, 5)}%` }}
                  >
                    {(item.amount / stats.totalAmount) * 100 > 10 ? `₹${item.amount.toFixed(0)}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Call to Action */}
      <div className="bg-[var(--primary-lightest)] rounded-2xl p-8 border border-[var(--primary-light)] text-center shadow-sm mb-8 animate-fade-in-up delay-5">
        <h3 className="text-xl font-bold text-[var(--primary-dark)] mb-2">
          Ready to create a new trip or add expenses?
        </h3>
        <p className="text-sm text-[var(--primary)] mb-6">
          Track your travel expenditures and manage reimbursements easily.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/trips"
            className="px-6 py-3 bg-white text-[var(--primary)] font-bold rounded-xl border border-[var(--primary-light)] hover:bg-gray-50 transition-colors shadow-sm"
          >
            📋 View All Trips
          </Link>
          <Link
            href="/trips/new"
            className="px-6 py-3 bg-[image:var(--gradient-primary)] text-white font-bold rounded-xl hover:shadow-md transition-all shadow-sm transform hover:-translate-y-0.5"
          >
            ➕ Create New Trip
          </Link>
        </div>
      </div>
    </main>
  );
}
