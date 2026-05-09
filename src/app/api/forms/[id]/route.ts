"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/forms/[id] - Get specific form template
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's group memberships
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { groupMemberships: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const form = await prisma.formTemplate.findUnique({
      where: { id },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Verify user belongs to the form's group
    const userGroupIds = user.groupMemberships.map(m => m.groupId);
    if (!userGroupIds.includes(form.groupId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({ form });
  } catch (error) {
    console.error("Error fetching form:", error);
    return NextResponse.json(
      { error: "Failed to fetch form" },
      { status: 500 }
    );
  }
}

// PATCH /api/forms/[id] - Update form template
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { groupMemberships: true },
    });

    if (!user || user.role !== "ADMINISTRATOR") {
      return NextResponse.json(
        { error: "Only administrators can update forms" },
        { status: 403 }
      );
    }

    const form = await prisma.formTemplate.findUnique({
      where: { id },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Verify admin is head of the form's group
    const adminGroups = user.groupMemberships.filter(m => m.role === "HEAD").map(m => m.groupId);
    if (!adminGroups.includes(form.groupId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { templateSchema, isActive } = body;

    // Validate templateSchema if provided
    if (templateSchema) {
      if (!templateSchema.fields || !Array.isArray(templateSchema.fields)) {
        return NextResponse.json(
          { error: "templateSchema.fields must be an array" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.formTemplate.update({
      where: { id },
      data: {
        ...(templateSchema && {
          templateSchema,
          version: form.version + 1,
        }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({
      form: updated,
      message: "Form template updated successfully",
    });
  } catch (error) {
    console.error("Error updating form:", error);
    return NextResponse.json(
      { error: "Failed to update form" },
      { status: 500 }
    );
  }
}

// DELETE /api/forms/[id] - Delete form template
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { groupMemberships: true },
    });

    if (!user || user.role !== "ADMINISTRATOR") {
      return NextResponse.json(
        { error: "Only administrators can delete forms" },
        { status: 403 }
      );
    }

    const form = await prisma.formTemplate.findUnique({
      where: { id },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Verify admin is head of the form's group
    const adminGroups = user.groupMemberships.filter(m => m.role === "HEAD").map(m => m.groupId);
    if (!adminGroups.includes(form.groupId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if form is being used in any submissions
    const submissionCount = await prisma.submission.count({
      where: { templateId: id },
    });

    if (submissionCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete form with ${submissionCount} submission(s)`,
        },
        { status: 409 }
      );
    }

    await prisma.formTemplate.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Form template deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting form:", error);
    return NextResponse.json(
      { error: "Failed to delete form" },
      { status: 500 }
    );
  }
}
