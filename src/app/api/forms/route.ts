"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET /api/forms - List all form templates
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's groups
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { groupMemberships: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const groupIds = user.groupMemberships.map(m => m.groupId);

    // Get query parameters for filtering
    const searchParams = req.nextUrl.searchParams;
    const isActive = searchParams.get("active");
    const search = searchParams.get("search")?.toLowerCase();
    const filterGroupId = searchParams.get("groupId");

    const whereClause: any = {
      groupId: { in: groupIds },
    };

    // If filtering by specific group, verify user is a member
    if (filterGroupId) {
      if (!groupIds.includes(filterGroupId)) {
        return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
      }
      whereClause.groupId = filterGroupId;
    }

    if (isActive === "true") {
      whereClause.isActive = true;
    } else if (isActive === "false") {
      whereClause.isActive = false;
    }

    const forms = await prisma.formTemplate.findMany({
      where: whereClause,
      select: {
        id: true,
        createdById: true,
        groupId: true,
        title: true,
        isActive: true,
        version: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    // Filter by search if provided
    let filtered = forms;
    if (search) {
      filtered = forms.filter((f) =>
        f.id.toLowerCase().includes(search) ||
        f.version.toString().includes(search)
      );
    }

    return NextResponse.json({
      forms: filtered,
      total: filtered.length,
    });
  } catch (error) {
    console.error("Error fetching forms:", error);
    return NextResponse.json(
      { error: "Failed to fetch forms" },
      { status: 500 }
    );
  }
}

// POST /api/forms - Create new form template
export async function POST(req: NextRequest) {
  try {
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
        { error: "Only administrators can create forms" },
        { status: 403 }
      );
    }

    const adminGroup = user.groupMemberships.find(m => m.role === "HEAD");
    if (!adminGroup) {
      return NextResponse.json({ error: "User is not a group head" }, { status: 403 });
    }

    const body = await req.json();
    const { templateSchema } = body;

    if (!templateSchema) {
      return NextResponse.json(
        { error: "templateSchema is required" },
        { status: 400 }
      );
    }

    // Validate templateSchema structure
    if (!templateSchema.fields || !Array.isArray(templateSchema.fields)) {
      return NextResponse.json(
        { error: "templateSchema.fields must be an array" },
        { status: 400 }
      );
    }

    // Create form template
    const form = await prisma.formTemplate.create({
      data: {
        createdById: session.user.id,
        groupId: adminGroup.groupId,
        title: "Untitled Form",
        templateSchema: JSON.stringify(templateSchema),
        isActive: true,
        version: 1,
      },
    });

    return NextResponse.json(
      { form, message: "Form template created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating form:", error);
    return NextResponse.json(
      { error: "Failed to create form" },
      { status: 500 }
    );
  }
}
