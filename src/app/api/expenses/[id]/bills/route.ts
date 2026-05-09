"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

interface Params {
  params: Promise<{ id: string }>;
}

// POST /api/expenses/[id]/bills - Upload bill file to expense
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const { id: expenseId } = resolvedParams;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user owns the expense through trip
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: { trip: true },
    });

    if (!expense) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      );
    }

    if (expense.trip.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size (max 25MB)
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 25MB)" },
        { status: 400 }
      );
    }

    // Validate file type
    const ALLOWED_TYPES = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Invalid file type. Allowed: PDF, images (PNG/JPG/WebP), Word, Excel",
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Create bill file record
    const billFile = await prisma.billFile.create({
      data: {
        expenseId,
        fileName: file.name,
        fileData: buffer,
        fileType: file.type,
        fileSize: file.size,
      },
    });

    return NextResponse.json(
      { bill: billFile, message: "Bill file uploaded successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error uploading bill:", error);
    return NextResponse.json(
      { error: "Failed to upload bill file" },
      { status: 500 }
    );
  }
}

// GET /api/expenses/[id]/bills - List bills for an expense
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const { id: expenseId } = resolvedParams;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user owns the expense through trip
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: { trip: true },
    });

    if (!expense) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      );
    }

    if (expense.trip.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const billFiles = await prisma.billFile.findMany({
      where: { expenseId },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        uploadedAt: true,
      },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json({ bills: billFiles });
  } catch (error) {
    console.error("Error fetching bills:", error);
    return NextResponse.json(
      { error: "Failed to fetch bills" },
      { status: 500 }
    );
  }
}
