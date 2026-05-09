import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { encryptAES, hashContent } from "@/lib/encryption";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { receiverId, plaintext, aesKey } = await req.json();

    const encryptedContent = encryptAES(plaintext, aesKey);
    const contentHash = hashContent(plaintext);

    const dm = await prisma.directMessage.create({
      data: {
        senderId: session.user.id,
        receiverId,
        encryptedContent,
        contentHash,
      },
    });

    return NextResponse.json(dm, { status: 201 });
  } catch (error) {
    console.error("Error sending DM:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const otherId = searchParams.get("otherId");

    if (!otherId) {
      // Return list of recent conversants if no otherId is specified
      const allDms = await prisma.directMessage.findMany({
        where: {
          OR: [
            { senderId: session.user.id },
            { receiverId: session.user.id },
          ],
        },
        include: {
          sender: true,
          receiver: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const userMap = new Map();

      for (const dm of allDms) {
        const isMeSender = dm.senderId === session.user.id;
        const otherUser = isMeSender ? dm.receiver : dm.sender;
        
        if (!userMap.has(otherUser.id)) {
          userMap.set(otherUser.id, {
            ...otherUser,
            unreadCount: 0,
            lastMessageAt: dm.createdAt
          });
        }
        
        // Count unread if I am the receiver
        if (!isMeSender && !dm.isRead) {
          userMap.get(otherUser.id).unreadCount++;
        }
      }

      const recentUsers = Array.from(userMap.values());
      return NextResponse.json(recentUsers);
    }

    const dms = await prisma.directMessage.findMany({
      where: {
        OR: [
          {
            senderId: session.user.id,
            receiverId: otherId,
          },
          {
            senderId: otherId,
            receiverId: session.user.id,
          },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    // Mark as read
    await prisma.directMessage.updateMany({
      where: {
        senderId: otherId,
        receiverId: session.user.id,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json(dms);
  } catch (error) {
    console.error("Error fetching DMs:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
