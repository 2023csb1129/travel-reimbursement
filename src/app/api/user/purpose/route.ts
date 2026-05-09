import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { purpose } = await req.json();

    if (!["floating", "expenses"].includes(purpose)) {
      return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
    }

    // Update user with purpose preference
    await prisma.user.update({
      where: { id: session.user.id },
      data: { userPurpose: purpose === "floating" ? "FLOATING_FORMS" : "MANAGING_EXPENSES" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user purpose:", error);
    return NextResponse.json(
      { error: "Failed to update purpose" },
      { status: 500 }
    );
  }
}
