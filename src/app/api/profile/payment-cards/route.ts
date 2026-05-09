"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET /api/profile/payment-cards - Get user's payment cards
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const paymentCards = await prisma.paymentCard.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ cards: paymentCards });
  } catch (error) {
    console.error("Error fetching payment cards:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment cards" },
      { status: 500 }
    );
  }
}

// POST /api/profile/payment-cards - Add new payment card
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { cardLabel, cardType, maskedNumber } = body;

    // Validation
    if (!cardLabel || !cardType || !maskedNumber) {
      return NextResponse.json(
        { error: "cardLabel, cardType, and maskedNumber are required" },
        { status: 400 }
      );
    }

    // Validation removed for custom payment methods

    // Check for duplicate cards
    const existingCard = await prisma.paymentCard.findFirst({
      where: {
        userId: session.user.id,
        maskedNumber: maskedNumber,
      },
    });

    if (existingCard) {
      return NextResponse.json(
        { error: "This card is already added" },
        { status: 409 }
      );
    }

    const newCard = await prisma.paymentCard.create({
      data: {
        userId: session.user.id,
        label: cardLabel.trim(),
        cardType,
        maskedNumber,
      },
    });

    return NextResponse.json(
      { card: newCard, message: "Payment card added successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating payment card:", error);
    return NextResponse.json(
      { error: "Failed to create payment card" },
      { status: 500 }
    );
  }
}
