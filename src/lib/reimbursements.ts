export type ReimbursementStatus = "Draft" | "Submitted" | "Approved" | "Paid";

export type ReimbursementClaim = {
  id: string;
  title: string;
  amount: number;
  category: string;
  status: ReimbursementStatus;
  submittedAt: string;
  receipt: string;
};

export const reimbursementStats = [
  { label: "Pending approval", value: "$1,280", detail: "4 claims awaiting review" },
  { label: "This month paid", value: "$4,620", detail: "+18% vs last month" },
  { label: "Average turnaround", value: "2.4 days", detail: "From submission to payout" },
];

export const reimbursementClaims: ReimbursementClaim[] = [
  {
    id: "RB-2041",
    title: "Conference travel - Pune",
    amount: 860,
    category: "Travel",
    status: "Submitted",
    submittedAt: "Today, 09:20 AM",
    receipt: "Flight, hotel, and local transport receipts attached",
  },
  {
    id: "RB-2034",
    title: "Client lunch with Acme team",
    amount: 142,
    category: "Meals",
    status: "Approved",
    submittedAt: "Yesterday, 04:10 PM",
    receipt: "Itemized bill and meeting notes attached",
  },
  {
    id: "RB-2028",
    title: "Software license renewal",
    amount: 480,
    category: "Tools",
    status: "Paid",
    submittedAt: "Apr 8, 11:45 AM",
    receipt: "Invoice attached and payment processed",
  },
  {
    id: "RB-2022",
    title: "Office supplies for Q2",
    amount: 96,
    category: "Supplies",
    status: "Draft",
    submittedAt: "Apr 6, 02:15 PM",
    receipt: "Draft saved locally for later review",
  },
];
