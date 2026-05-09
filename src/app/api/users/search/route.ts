import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    if (!query) {
      // By default, maybe return users they've messaged before?
      // For simplicity, just return an empty array if no query
      return NextResponse.json([]);
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            username: {
              contains: query,
              // sqlite is case insensitive for LIKE usually, but we ensure it matches
            },
          },
          {
            id: {
              not: session.user.id, // don't search yourself
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
      },
      take: 10,
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("User search error:", error);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
