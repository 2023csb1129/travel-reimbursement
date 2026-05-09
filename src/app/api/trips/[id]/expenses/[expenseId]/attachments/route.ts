import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

type Params = Promise<{ id: string; expenseId: string }>;

export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: tripId, expenseId } = await params;

    // Verify trip ownership
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip || trip.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Verify expense belongs to trip
    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!expense || expense.tripId !== tripId) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const fileData = Buffer.from(buffer);

    const billFile = await prisma.billFile.create({
      data: {
        expenseId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileData,
        uploadedAt: new Date(),
      },
    });

    return NextResponse.json({ billFile }, { status: 201 });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: tripId, expenseId } = await params;
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip || trip.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!expense || expense.tripId !== tripId) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    if (fileId) {
      const billFile = await prisma.billFile.findUnique({ where: { id: fileId } });
      if (!billFile || billFile.expenseId !== expenseId) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
      return new NextResponse(billFile.fileData, {
        headers: {
          "Content-Type": billFile.fileType,
          "Content-Disposition": `attachment; filename="${billFile.fileName}"`,
        },
      });
    } else {
      const billFiles = await prisma.billFile.findMany({
        where: { expenseId },
        orderBy: { uploadedAt: "desc" },
        select: { id: true, fileName: true, fileType: true, fileSize: true, uploadedAt: true },
      });
      return NextResponse.json({ billFiles }, { status: 200 });
    }
  } catch (error) {
    console.error("Error fetching files:", error);
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: tripId, expenseId } = await params;
    const { fileId } = await request.json();

    if (!fileId) {
      return NextResponse.json({ error: "fileId is required" }, { status: 400 });
    }

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip || trip.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!expense || expense.tripId !== tripId) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const billFile = await prisma.billFile.findUnique({ where: { id: fileId } });
    if (!billFile || billFile.expenseId !== expenseId) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    await prisma.billFile.delete({ where: { id: fileId } });
    return NextResponse.json({ message: "File deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}
