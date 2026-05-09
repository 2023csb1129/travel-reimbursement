import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generateRandomId(length: number) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMINISTRATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    // Generate unique credentials
    const groupId = `GRP-${generateRandomId(6)}`;
    const secretKey = `SEC-${generateRandomId(8)}`;

    const group = await prisma.group.create({
      data: {
        groupId,
        secretKey,
        name,
        description,
        createdById: session.user.id,
        // Automatically make the creator the HEAD of the group
        members: {
          create: {
            userId: session.user.id,
            role: "HEAD"
          }
        }
      }
    });

    return NextResponse.json({ success: true, group }, { status: 201 });
  } catch (error) {
    console.error("Create group error:", error);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If ADMINISTRATOR, return groups they created
    // If USER, return groups they joined
    const role = session.user.role;

    if (role === "ADMINISTRATOR") {
      const groups = await prisma.group.findMany({
        where: { createdById: session.user.id },
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: 'desc' }
      });
      return NextResponse.json({ groups });
    } else {
      const memberships = await prisma.groupMembership.findMany({
        where: { userId: session.user.id },
        include: { group: true },
        orderBy: { joinedAt: 'desc' }
      });
      const groups = memberships.map(m => m.group);
      return NextResponse.json({ groups });
    }

  } catch (error) {
    console.error("Fetch groups error:", error);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}
