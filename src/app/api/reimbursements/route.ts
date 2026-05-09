import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reimbursementSchema } from "@/lib/validations";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reimbursements = await prisma.reimbursement.findMany({
      where: { userId: session.user.id },
      include: { attachments: true, approvals: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ reimbursements });
  } catch (error) {
    console.error("Error fetching reimbursements:", error);
    return NextResponse.json(
      { error: "Failed to fetch reimbursements" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = reimbursementSchema.parse(body);

    const reimbursement = await prisma.reimbursement.create({
      data: {
        userId: session.user.id,
        title: validated.title,
        amount: validated.amount,
        category: validated.category,
        receiptNotes: validated.receiptNotes,
        description: validated.description,
        status: "DRAFT",
      },
      include: { attachments: true },
    });

    return NextResponse.json({ reimbursement }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating reimbursement:", error);
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create reimbursement" },
      { status: 500 }
    );
  }
}
