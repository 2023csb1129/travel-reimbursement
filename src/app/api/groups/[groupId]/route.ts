import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ groupId: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = await params;

    // Find the group
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, groupId: true, name: true, description: true, createdAt: true },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Verify user is a member
    const membership = await prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId: groupId, userId: session.user.id } },
    });

    if (!membership) {
      return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 });
    }

    return NextResponse.json({ group });
  } catch (error) {
    console.error("GET /api/groups/[groupId]:", error);
    return NextResponse.json({ error: "Failed to fetch group" }, { status: 500 });
  }
}
