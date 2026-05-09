"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET /api/trips - List user's trips with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    
    // Query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const includeArchived = searchParams.get("archived") === "true";
    const favorites = searchParams.get("favorites") === "true";
    const sortBy = searchParams.get("sort") || "createdAt";
    const search = searchParams.get("search") || "";

    const where: any = { userId };

    if (!includeArchived) {
      where.isArchived = false;
    }

    if (favorites) {
      where.isFavorite = true;
    }

    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    const trips = await prisma.trip.findMany({
      where,
      include: {
        _count: {
          select: { expenses: true },
        },
      },
      orderBy: {
        [sortBy === "date" ? "startDate" : sortBy]: "desc",
      },
    });

    // Calculate totals for each trip
    const tripsWithTotals = await Promise.all(
      trips.map(async (trip) => {
        const expenses = await prisma.expense.findMany({
          where: { tripId: trip.id },
        });

        const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const netReimbursable = total - (trip.advanceDrawn || 0);

        return {
          ...trip,
          totalAmount: total,
          netReimbursable: netReimbursable,
          expenseCount: trip._count.expenses,
        };
      })
    );

    return NextResponse.json({ trips: tripsWithTotals });
  } catch (error) {
    console.error("Error fetching trips:", error);
    return NextResponse.json(
      { error: "Failed to fetch trips" },
      { status: 500 }
    );
  }
}

// POST /api/trips - Create new trip
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const data = await request.json();

    const {
      title,
      startDate,
      isComplete,
      advanceddrawn,
      budgetHead,
      notes,
    } = data;

    if (!title || !startDate) {
      return NextResponse.json(
        { error: "Title and startDate are required" },
        { status: 400 }
      );
    }

    const trip = await prisma.trip.create({
      data: {
        userId,
        title,
        startDate: new Date(startDate),
        isCompleted: isComplete || false,
        advanceDrawn: advanceddrawn || 0,
        budgetHead: budgetHead || "",
        notes: notes || "",
      },
    });

    return NextResponse.json({ trip }, { status: 201 });
  } catch (error) {
    console.error("Error creating trip:", error);
    return NextResponse.json(
      { error: "Failed to create trip" },
      { status: 500 }
    );
  }
}
