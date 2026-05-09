"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET /api/trips/[id] - Get specific trip with expenses
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        expenses: {
          orderBy: { paymentDate: "desc" },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Verify ownership
    if (trip.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Calculate categories breakdown
    const travelExpenses = trip.expenses.filter((e) => e.category === "Travel");
    const otherExpenses = trip.expenses.filter((e) => e.category === "Other");
    const personalExpenses = trip.expenses.filter((e) => e.category === "Personal");

    const travelTotal = travelExpenses.reduce((sum, e) => sum + e.amount, 0);
    const otherTotal = otherExpenses.reduce((sum, e) => sum + e.amount, 0);
    const personalTotal = personalExpenses.reduce((sum, e) => sum + e.amount, 0);

    const totalReimbursable = travelTotal + otherTotal;
    const netReimbursable = totalReimbursable - (trip.advanceDrawn || 0);

    return NextResponse.json({
      trip: {
        ...trip,
        breakdown: {
          travelTotal,
          otherTotal,
          personalTotal,
          totalReimbursable,
          netReimbursable,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching trip:", error);
    return NextResponse.json(
      { error: "Failed to fetch trip" },
      { status: 500 }
    );
  }
}

// PATCH /api/trips/[id] - Update trip
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const trip = await prisma.trip.findUnique({
      where: { id },
    });

    if (!trip || trip.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const data = await request.json();

    const updated = await prisma.trip.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(typeof data.isComplete === "boolean" && { isComplete: data.isComplete }),
        ...(typeof data.advanceddrawn === "number" && { advanceddrawn: data.advanceddrawn }),
        ...(data.budgetHead && { budgetHead: data.budgetHead }),
        ...(data.notes && { notes: data.notes }),
        ...(typeof data.isFavorite === "boolean" && { isFavorite: data.isFavorite }),
        ...(typeof data.isArchived === "boolean" && { isArchived: data.isArchived }),
      },
    });

    return NextResponse.json({ trip: updated });
  } catch (error) {
    console.error("Error updating trip:", error);
    return NextResponse.json(
      { error: "Failed to update trip" },
      { status: 500 }
    );
  }
}

// DELETE /api/trips/[id] - Delete trip
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const trip = await prisma.trip.findUnique({
      where: { id },
    });

    if (!trip || trip.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    await prisma.trip.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Trip deleted successfully" });
  } catch (error) {
    console.error("Error deleting trip:", error);
    return NextResponse.json(
      { error: "Failed to delete trip" },
      { status: 500 }
    );
  }
}
