"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/bills/[id] - Download bill file
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const billFile = await prisma.billFile.findUnique({
      where: { id },
      include: { expense: { include: { trip: true } } },
    });

    if (!billFile) {
      return NextResponse.json({ error: "Bill file not found" }, { status: 404 });
    }

    // Verify ownership through trip
    if (billFile.expense.trip.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Return file with appropriate headers
    const headers = new Headers();
    headers.set("Content-Type", billFile.fileType || "application/octet-stream");
    headers.set(
      "Content-Disposition",
      `attachment; filename="${billFile.fileName}"`
    );
    headers.set("Content-Length", billFile.fileSize?.toString() || "0");
    headers.set("Cache-Control", "public, max-age=86400"); // Cache for 24 hours

    return new NextResponse(billFile.fileData, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error downloading bill file:", error);
    return NextResponse.json(
      { error: "Failed to download bill file" },
      { status: 500 }
    );
  }
}

// DELETE /api/bills/[id] - Delete bill file
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const billFile = await prisma.billFile.findUnique({
      where: { id },
      include: { expense: { include: { trip: true } } },
    });

    if (!billFile) {
      return NextResponse.json({ error: "Bill file not found" }, { status: 404 });
    }

    // Verify ownership through trip
    if (billFile.expense.trip.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.billFile.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Bill file deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting bill file:", error);
    return NextResponse.json(
      { error: "Failed to delete bill file" },
      { status: 500 }
    );
  }
}
