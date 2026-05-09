"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET /api/submissions - List submissions
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

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const tripId = searchParams.get("tripId");
    const templateId = searchParams.get("templateId");

    const groupIds = user.groupMemberships.map(m => m.groupId);
    const whereClause: any = {
      groupId: { in: groupIds },
    };

    if (status) {
      whereClause.status = status;
    }

    // If user is Submitter, they can only see their own submissions
    if (user.role === "SUBMITTER") {
      whereClause.userId = session.user.id;
    }

    if (tripId) {
      whereClause.tripId = tripId;
    }

    if (templateId) {
      whereClause.templateId = templateId;
    }

    // Filter by institute via trip
    const submissions = await prisma.submission.findMany({
      where: whereClause,
      include: {
        template: {
          select: { id: true, title: true, version: true, templateSchema: true },
        },
        user: {
          select: { id: true, email: true, name: true },
        },
        trip: {
          select: { id: true, title: true, userId: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Filter submissions to only institute members (for admins)
    const filtered = submissions.filter((s) => {
      if (user.role === "ADMINISTRATOR") {
        // Admin can see all submissions in their institute
        return true;
      }
      return s.user.id === session.user?.id;
    });

    return NextResponse.json({
      submissions: filtered,
      total: filtered.length,
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}

// POST /api/submissions - Create new submission
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { groupMemberships: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { templateId, tripId, status, formData, expenseSelections } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: "templateId is required" },
        { status: 400 }
      );
    }

    // Verify template exists and belongs to user's groups
    const template = await prisma.formTemplate.findUnique({
      where: { id: templateId },
    });

    const userGroupIds = user.groupMemberships.map(m => m.groupId);
    if (!template || !userGroupIds.includes(template.groupId)) {
      return NextResponse.json(
        { error: "Form template not found" },
        { status: 404 }
      );
    }

    // Get or Create Trip
    let finalTripId = tripId;
    let trip;

    if (finalTripId) {
      trip = await prisma.trip.findUnique({
        where: { id: finalTripId },
      });

      if (!trip || trip.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Trip not found or unauthorized" },
          { status: 404 }
        );
      }
    } else {
      // Auto-create a trip if no trip context was explicitly provided
      trip = await prisma.trip.create({
        data: {
          userId: session.user.id,
          title: `Direct Reimbursement - ${new Date().toLocaleDateString()}`,
          startDate: new Date(),
          purpose: "Direct submission from Reimbursements Dashboard",
        }
      });
      finalTripId = trip.id;
    }

    const submission = await prisma.submission.create({
      data: {
        templateId: templateId,
        userId: session.user.id,
        tripId: finalTripId,
        groupId: template.groupId,
        status: status || "SUBMITTED",
        submissionDate: new Date(),
        formData: formData ? JSON.stringify({ ...formData, _expenseSelections: expenseSelections }) : null,
      },
      include: {
        template: { select: { id: true, version: true, templateSchema: true } },
        user: { select: { id: true, email: true, name: true } },
        trip: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(
      { submission, message: "Submission created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating submission:", error);
    return NextResponse.json(
      { error: "Failed to create submission" },
      { status: 500 }
    );
  }
}
