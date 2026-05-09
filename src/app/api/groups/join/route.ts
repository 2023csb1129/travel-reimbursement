import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId, secretKey } = await req.json();

    if (!groupId || !secretKey) {
      return NextResponse.json({ error: "Group ID and Secret Key are required" }, { status: 400 });
    }

    // Find the group
    const group = await prisma.group.findUnique({
      where: { groupId }
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.secretKey !== secretKey) {
      return NextResponse.json({ error: "Invalid Secret Key" }, { status: 403 });
    }

    // Check if user is already a member
    const existingMembership = await prisma.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: session.user.id
        }
      }
    });

    if (existingMembership) {
      return NextResponse.json({ error: "You are already a member of this group" }, { status: 400 });
    }

    // Join the group
    await prisma.groupMembership.create({
      data: {
        groupId: group.id,
        userId: session.user.id,
        role: "MEMBER"
      }
    });

    return NextResponse.json({ success: true, group }, { status: 200 });
  } catch (error) {
    console.error("Join group error:", error);
    return NextResponse.json({ error: "Failed to join group" }, { status: 500 });
  }
}
