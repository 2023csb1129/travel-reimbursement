import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  const customOptions = {
    ...authOptions,
    adapter: {
      ...authOptions.adapter,
      createUser: async (data: any) => {
        const mode = req.cookies.auth_mode || "signin";
        
        // Note: Strict Mode is disabled. If a user signs in with Google and doesn't have an account,
        // we allow creation, and auth.ts will redirect them to the username setup page.

        // Read role from cookie, fallback to USER if not set
        const role = req.cookies.google_signup_role || "USER";
        
        return prisma.user.create({
          data: {
            ...data,
            role,
          },
        });
      },
    } as any
  };

  return await NextAuth(req, res, customOptions);
}
