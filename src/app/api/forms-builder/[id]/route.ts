import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export async function GET(req: NextRequest, context: { params: Params }) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { groupMemberships: true },
    });

    if (user?.role !== "ADMINISTRATOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminGroup = user.groupMemberships.find(m => m.role === "HEAD");
    if (!adminGroup) {
      return NextResponse.json({ error: "User is not a group head" }, { status: 403 });
    }

    const form = await prisma.formTemplate.findFirst({
      where: {
        id,
        createdById: session.user.id,
        groupId: adminGroup.groupId,
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    return NextResponse.json({
      form: {
        ...form,
        templateSchema: JSON.parse(form.templateSchema),
      },
    });
  } catch (error) {
    console.error("GET /api/forms-builder/:id:", error);
    return NextResponse.json(
      { error: "Failed to fetch form" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, context: { params: Params }) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { groupMemberships: true },
    });

    if (user?.role !== "ADMINISTRATOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminGroup = user.groupMemberships.find(m => m.role === "HEAD");
    if (!adminGroup) {
      return NextResponse.json({ error: "User is not a group head" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, templateSchema, isActive } = body;

    const form = await prisma.formTemplate.findFirst({
      where: {
        id,
        createdById: session.user.id,
        groupId: adminGroup.groupId,
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const updated = await prisma.formTemplate.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(templateSchema && { templateSchema: JSON.stringify(templateSchema) }),
        ...(isActive !== undefined && { isActive }),
        version: form.version + 1,
      },
    });

    return NextResponse.json({
      form: {
        ...updated,
        templateSchema: JSON.parse(updated.templateSchema),
      },
    });
  } catch (error) {
    console.error("PUT /api/forms-builder/:id:", error);
    return NextResponse.json(
      { error: "Failed to update form" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: { params: Params }) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { groupMemberships: true },
    });

    if (user?.role !== "ADMINISTRATOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminGroup = user.groupMemberships.find(m => m.role === "HEAD");
    if (!adminGroup) {
      return NextResponse.json({ error: "User is not a group head" }, { status: 403 });
    }

    const form = await prisma.formTemplate.findFirst({
      where: {
        id,
        createdById: session.user.id,
        groupId: adminGroup.groupId,
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Check if form has any submissions
    const submissionCount = await prisma.submission.count({
      where: { templateId: id },
    });

    if (submissionCount > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete form with existing submissions",
          submissionCount,
        },
        { status: 409 }
      );
    }

    await prisma.formTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Form deleted" });
  } catch (error) {
    console.error("DELETE /api/forms-builder/:id:", error);
    return NextResponse.json(
      { error: "Failed to delete form" },
      { status: 500 }
    );
  }
}
