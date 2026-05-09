import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/profile - Get user profile
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        empCode: true,
        designation: true,
        department: true,
        gradeLvl: true,
        bankAccount: true,
        ifscCode: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("GET /api/profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/profile - Update user profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: body.name ?? undefined,
        empCode: body.empCode ?? undefined,
        designation: body.designation ?? undefined,
        department: body.department ?? undefined,
        gradeLvl: body.gradeLvl ?? undefined,
        bankAccount: body.bankAccount ?? undefined,
        ifscCode: body.ifscCode ?? undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        empCode: true,
        designation: true,
        department: true,
        gradeLvl: true,
        bankAccount: true,
        ifscCode: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("PATCH /api/profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

