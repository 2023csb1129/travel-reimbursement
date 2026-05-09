"use server";

import { NextResponse } from "next/server";

// This route is deprecated - use /api/expenses/[id]/bills instead
export async function GET() {
  return NextResponse.json(
    { error: "This endpoint is deprecated. Use /api/expenses/[id]/bills instead." },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "This endpoint is deprecated. Use /api/expenses/[id]/bills instead." },
    { status: 410 }
  );
}
