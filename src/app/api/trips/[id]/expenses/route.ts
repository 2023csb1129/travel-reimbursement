import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/trips/[id]/expenses - Get all expenses for a trip
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
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    if (trip.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const expenses = await prisma.expense.findMany({
      where: { tripId: id },
      orderBy: { paymentDate: "desc" },
    });

    return NextResponse.json({ expenses });
  } catch (error) {
    console.error("GET /api/trips/[id]/expenses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/trips/[id]/expenses - Create new expense
export async function POST(
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
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    if (trip.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();

    // Validation
    if (!body.title || !body.amount) {
      return NextResponse.json(
        { error: "Title and amount are required" },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        title: body.title,
        description: body.description || null,
        amount: parseFloat(body.amount),
        category: body.category || "Other",
        expenseType: body.expenseType || "Other",
        currency: body.currency || "INR",
        paymentDate: new Date(body.paymentDate || new Date()),
        tripId: id,
        submittedById: session.user.id,
        metadata: body.metadata || null,
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error("POST /api/trips/[id]/expenses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
