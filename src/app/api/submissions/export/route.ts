"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

interface Params {
  params: Promise<{}>;
}

// GET /api/submissions/export - Export submissions data
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can export submissions
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (user?.role !== "ADMINISTRATOR")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const searchParams = req.nextUrl.searchParams;
    const format = searchParams.get("format") || "json"; // json, csv
    const tripId = searchParams.get("tripId");
    const templateId = searchParams.get("templateId");

    const whereClause: any = {};
    if (tripId) whereClause.tripId = tripId;
    if (templateId) whereClause.templateId = templateId;

    const submissions = await prisma.submission.findMany({
      where: whereClause,
      include: {
        template: true,
        user: { select: { id: true, email: true, name: true } },
        trip: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (format === "csv") {
      // Convert to CSV format
      const csv = [
        ["ID", "Trip", "Submitter", "Email", "Status", "Created At"].join(","),
        ...submissions.map((s) =>
          [
            s.id,
            `"${s.trip.title}"`,
            `"${s.user.name || ""}"`,
            s.user.email,
            s.status,
            new Date(s.createdAt).toISOString(),
          ].join(",")
        ),
      ].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="submissions_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // Default to JSON
    return NextResponse.json({
      submissions,
      total: submissions.length,
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error exporting submissions:", error);
    return NextResponse.json(
      { error: "Failed to export submissions" },
      { status: 500 }
    );
  }
}
