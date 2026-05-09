import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reimbursementSchema, approvalSchema } from "@/lib/validations";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reimbursement = await prisma.reimbursement.findUnique({
      where: { id },
      include: { attachments: true, approvals: { include: { approver: true } } },
    });

    if (!reimbursement) {
      return NextResponse.json(
        { error: "Reimbursement not found" },
        { status: 404 }
      );
    }

    // Check if user owns the reimbursement or is an admin
    if (
      reimbursement.userId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ reimbursement });
  } catch (error) {
    console.error("Error fetching reimbursement:", error);
    return NextResponse.json(
      { error: "Failed to fetch reimbursement" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reimbursement = await prisma.reimbursement.findUnique({
      where: { id },
    });

    if (!reimbursement) {
      return NextResponse.json(
        { error: "Reimbursement not found" },
        { status: 404 }
      );
    }

    if (reimbursement.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // If updating the submission itself (non-draft update)
    if (body.status === "SUBMITTED" && reimbursement.status === "DRAFT") {
      const updated = await prisma.reimbursement.update({
        where: { id },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          currentApprover: "manager@company.com", // In real app, assign to employee's manager
        },
        include: { attachments: true },
      });
      return NextResponse.json({ reimbursement: updated });
    }

    // If updating as a manager/admin (approval workflow)
    if (body.action === "approve" || body.action === "reject") {
      if (session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const approval = await prisma.approval.create({
        data: {
          reimbursementId: id,
          approverId: session.user.id,
          status: body.action === "approve" ? "APPROVED" : "REJECTED",
          remarks: body.remarks,
          approvedAt: new Date(),
        },
      });

      const newStatus =
        body.action === "approve"
          ? "APPROVED"
          : body.action === "reject"
            ? "REJECTED"
            : "PENDING_REVISION";

      const updated = await prisma.reimbursement.update({
        where: { id },
        data: {
          status: newStatus,
          [body.action === "approve"
            ? "approvedAt"
            : body.action === "reject"
              ? "rejectedAt"
              : "updatedAt"]: new Date(),
          rejectionReason: body.remarks,
        },
        include: { attachments: true, approvals: true },
      });

      return NextResponse.json({ reimbursement: updated });
    }

    return NextResponse.json(
      { error: "Invalid update action" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error updating reimbursement:", error);
    return NextResponse.json(
      { error: "Failed to update reimbursement" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reimbursement = await prisma.reimbursement.findUnique({
      where: { id },
    });

    if (!reimbursement) {
      return NextResponse.json(
        { error: "Reimbursement not found" },
        { status: 404 }
      );
    }

    if (
      reimbursement.userId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (reimbursement.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Can only delete draft reimbursements" },
        { status: 400 }
      );
    }

    await prisma.reimbursement.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting reimbursement:", error);
    return NextResponse.json(
      { error: "Failed to delete reimbursement" },
      { status: 500 }
    );
  }
}
