import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// DELETE /api/profile/payment-cards/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify card belongs to user
    const card = await prisma.paymentCard.findFirst({
      where: { id: id, userId: session.user.id },
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    await prisma.paymentCard.delete({ where: { id: id } });
    return NextResponse.json({ message: "Card deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/profile/payment-cards/[id]:", error);
    return NextResponse.json({ error: "Failed to delete card" }, { status: 500 });
  }
}
