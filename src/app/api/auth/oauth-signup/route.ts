import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email, name, image, username } = await req.json();

    if (!email || !username) {
      return NextResponse.json(
        { error: "Email and username are required" },
        { status: 400 }
      );
    }

    // Check if username is already taken
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists with this email" },
        { status: 409 }
      );
    }

    const role = email.toLowerCase().startsWith("manager") || email.toLowerCase().startsWith("admin") ? "ADMINISTRATOR" : "USER";

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name || email.split("@")[0],
        username,
        image,
        role,
      },
    });

    return NextResponse.json(
      { 
        message: "Account created successfully",
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("OAuth Signup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create account" },
      { status: 500 }
    );
  }
}
