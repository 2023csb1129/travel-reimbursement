"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/submissions/[id] - Get submission details
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        template: true,
        user: { select: { id: true, email: true, name: true } },
        trip: {
          include: {
            expenses: {
              include: { bills: true, submittedBy: true },
            },
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Verify ownership or admin access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isOwner = submission.userId === session.user.id;
    const isAdmin = user.role === "ADMINISTRATOR";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({ submission });
  } catch (error) {
    console.error("Error fetching submission:", error);
    return NextResponse.json(
      { error: "Failed to fetch submission" },
      { status: 500 }
    );
  }
}

// PATCH /api/submissions/[id] - Update submission
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const submission = await prisma.submission.findUnique({
      where: { id },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Verify ownership or Admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    const isOwner = submission.userId === session.user.id;
    const isAdmin = user?.role === "ADMINISTRATOR";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { status, formData, reviewNotes, signatures } = body;

    const validStatuses = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "REIMBURSED"];
    if (status && !validStatuses.includes(status.toUpperCase())) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const updated = await prisma.submission.update({
      where: { id },
      data: {
        ...(status && { status: status.toUpperCase() }),
        ...(reviewNotes !== undefined && { reviewNotes }),
        ...(signatures !== undefined && { signatures: JSON.stringify(signatures) }),
        ...(formData !== undefined && { formData: typeof formData === "string" ? formData : JSON.stringify(formData) }),
      },
      include: {
        template: true,
        user: { select: { id: true, email: true, name: true } },
        trip: true,
      },
    });

    return NextResponse.json({
      submission: updated,
      message: "Submission updated successfully",
    });
  } catch (error) {
    console.error("Error updating submission:", error);
    return NextResponse.json(
      { error: "Failed to update submission" },
      { status: 500 }
    );
  }
}

// DELETE /api/submissions/[id] - Delete submission
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const submission = await prisma.submission.findUnique({
      where: { id },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (submission.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Only allow deletion of draft submissions
    if (submission.status !== "Draft") {
      return NextResponse.json(
        { error: "Only draft submissions can be deleted" },
        { status: 409 }
      );
    }

    await prisma.submission.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Submission deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting submission:", error);
    return NextResponse.json(
      { error: "Failed to delete submission" },
      { status: 500 }
    );
  }
}
