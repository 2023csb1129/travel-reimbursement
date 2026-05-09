"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/expenses/[id] - Get specific expense
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        trip: true,
        bills: true,
        submittedBy: true,
      },
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Verify ownership through trip
    const trip = await prisma.trip.findUnique({
      where: { id: expense.tripId },
    });

    if (!trip || trip.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    return NextResponse.json({ expense });
  } catch (error) {
    console.error("Error fetching expense:", error);
    return NextResponse.json(
      { error: "Failed to fetch expense" },
      { status: 500 }
    );
  }
}

// PATCH /api/expenses/[id] - Update expense
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: { trip: true },
    });

    if (!expense || expense.trip.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const data = await req.json();

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.amount !== undefined && { amount: parseFloat(data.amount) }),
        ...(data.currency && { currency: data.currency }),
        ...(data.date && { paymentDate: new Date(data.date) }),
        ...(data.expenseType && { expenseType: data.expenseType }),
        ...(data.category && {
          category: ["Travel", "Accommodation", "Other", "Personal"].includes(data.category)
            ? data.category
            : undefined,
        }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.vendor && { vendor: data.vendor }),
        ...(data.paymentMethod && { paymentMethod: data.paymentMethod }),
        ...(data.transactionNumber && { transactionNumber: data.transactionNumber }),
        ...(data.metadata && { metadata: typeof data.metadata === 'string' ? data.metadata : JSON.stringify(data.metadata) }),
      },
      include: {
        bills: true,
        trip: true,
        submittedBy: true,
      },
    });

    return NextResponse.json({ expense: updated });
  } catch (error) {
    console.error("Error updating expense:", error);
    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 500 }
    );
  }
}

// DELETE /api/expenses/[id] - Delete expense
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: { trip: true },
    });

    if (!expense || expense.trip.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Delete associated bill files
    await prisma.billFile.deleteMany({
      where: { expenseId: id },
    });

    await prisma.expense.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      { error: "Failed to delete expense" },
      { status: 500 }
    );
  }
}
