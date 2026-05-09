import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMINISTRATORs can access this
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { groupMemberships: { include: { group: true } } }
    });

    if (user?.role !== "ADMINISTRATOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all groups this user heads
    const headGroups = user.groupMemberships.filter(m => m.role === "HEAD");
    if (headGroups.length === 0) {
      return NextResponse.json({ forms: [], groups: [], total: 0 });
    }

    // Check if a specific groupId is requested via query param
    const { searchParams } = new URL(req.url);
    const requestedGroupId = searchParams.get("groupId");

    const groupIds = headGroups.map(m => m.groupId);

    // If specific group requested, verify user is HEAD of it
    let filterGroupIds = groupIds;
    if (requestedGroupId) {
      if (!groupIds.includes(requestedGroupId)) {
        return NextResponse.json({ error: "You are not a head of this group" }, { status: 403 });
      }
      filterGroupIds = [requestedGroupId];
    }

    // Fetch all form templates for these groups
    const forms = await prisma.formTemplate.findMany({
      where: {
        createdById: session.user.id,
        groupId: { in: filterGroupIds },
      },
      include: {
        group: { select: { id: true, name: true, groupId: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Return groups list as well for the frontend selector
    const groups = headGroups.map(m => ({
      id: m.group.id,
      name: m.group.name,
      groupId: m.group.groupId,
    }));

    return NextResponse.json({
      forms,
      groups,
      total: forms.length,
    });
  } catch (error) {
    console.error("GET /api/forms:", error);
    return NextResponse.json(
      { error: "Failed to fetch forms" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { groupMemberships: true }
    });

    if (user?.role !== "ADMINISTRATOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, templateSchema, groupId: requestedGroupId } = body;

    // Determine which group to use
    let groupId: string;
    if (requestedGroupId) {
      // Verify user is HEAD of the requested group
      const membership = user.groupMemberships.find(
        m => m.groupId === requestedGroupId && m.role === "HEAD"
      );
      if (!membership) {
        return NextResponse.json(
          { error: "You are not a head of this group" },
          { status: 403 }
        );
      }
      groupId = requestedGroupId;
    } else {
      // Fallback: use first group where user is HEAD
      const adminGroup = user.groupMemberships.find(m => m.role === "HEAD");
      if (!adminGroup) {
        return NextResponse.json({ error: "You must create a group first before creating forms" }, { status: 403 });
      }
      groupId = adminGroup.groupId;
    }

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!templateSchema) {
      return NextResponse.json(
        { error: "Form schema is required" },
        { status: 400 }
      );
    }

    // Check if form with same title exists in this group
    const existing = await prisma.formTemplate.findUnique({
      where: {
        groupId_title: {
          groupId: groupId,
          title,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Form with this title already exists in this group" },
        { status: 409 }
      );
    }

    const form = await prisma.formTemplate.create({
      data: {
        title,
        description: description || null,
        templateSchema: JSON.stringify(templateSchema),
        createdById: session.user.id,
        groupId: groupId,
        isActive: true,
        version: 1,
      },
      include: {
        group: { select: { id: true, name: true, groupId: true } },
      },
    });

    return NextResponse.json({ form }, { status: 201 });
  } catch (error) {
    console.error("POST /api/forms:", error);
    return NextResponse.json(
      { error: "Failed to create form" },
      { status: 500 }
    );
  }
}
