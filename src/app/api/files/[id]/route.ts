import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const billFile = await prisma.billFile.findUnique({
      where: { id },
      include: {
        expense: {
          include: {
            trip: { select: { userId: true } },
          },
        },
      },
    });

    if (!billFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Verify the user owns this file's trip
    if (billFile.expense.trip.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return new NextResponse(billFile.fileData, {
      headers: {
        "Content-Type": billFile.fileType,
        "Content-Disposition": `inline; filename="${billFile.fileName}"`,
        "Content-Length": billFile.fileSize.toString(),
      },
    });
  } catch (error) {
    console.error("Error fetching file:", error);
    return NextResponse.json({ error: "Failed to fetch file" }, { status: 500 });
  }
}
