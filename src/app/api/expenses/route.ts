"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET /api/expenses - List expenses by trip ID
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tripId = request.nextUrl.searchParams.get("tripId");
    const category = request.nextUrl.searchParams.get("category");

    if (!tripId) {
      return NextResponse.json(
        { error: "tripId query parameter is required" },
        { status: 400 }
      );
    }

    // Verify trip ownership
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip || trip.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const where: any = { tripId };
    if (category) {
      where.category = category;
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        bills: true,
        trip: true,
        submittedBy: true,
      },
      orderBy: { paymentDate: "desc" },
    });

    return NextResponse.json({ expenses });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

// POST /api/expenses - Create new expense
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    const {
      tripId,
      category,
      expenseType,
      title,
      amount,
      currency,
      date,
      description,
      transactionNumber,
      paymentMethod,
      vendor,
      metadata,
    } = data;

    if (!tripId || !category || !title || !amount) {
      return NextResponse.json(
        { error: "tripId, category, title, and amount are required" },
        { status: 400 }
      );
    }

    // Verify trip ownership
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip || trip.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Validate category
    if (!["Travel", "Accommodation", "Other", "Personal"].includes(category)) {
      return NextResponse.json(
        { error: "Invalid category. Must be Travel, Accommodation, Other, or Personal" },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        tripId,
        submittedById: session.user.id,
        category,
        expenseType: expenseType || "Other",
        title,
        amount: parseFloat(amount),
        currency: currency || "INR",
        paymentDate: new Date(date),
        description: description || "",
        transactionNumber: transactionNumber || null,
        paymentMethod: paymentMethod || null,
        vendor: vendor || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
      include: {
        bills: true,
        trip: true,
        submittedBy: true,
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    );
  }
}
