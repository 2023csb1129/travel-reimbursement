import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { NextAuthOptions } from "next-auth";
import bcryptjs from "bcryptjs";
declare module "next-auth" {
  interface User {
    id?: string;
    role?: string;
  }
  interface Session {
    user?: {
      id?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role?: string;
    };
  }
}

export const authOptions: NextAuthOptions = {
  adapter: {
    ...(PrismaAdapter(prisma) as any),
    createUser: async (data: any) => {
      const role = data.email.toLowerCase().startsWith("manager") || data.email.toLowerCase().startsWith("admin") ? "ADMINISTRATOR" : "USER";
      
      return prisma.user.create({
        data: {
          ...data,
          role,
        },
      });
    },
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "demo@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        const email = credentials.email.toLowerCase().trim();
        let user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          throw new Error("No user found with this email");
        } 
        
        if (user.password) {
          const passwordMatch = await bcryptjs.compare(
            credentials.password,
            user.password
          );
          if (!passwordMatch) {
            throw new Error("Invalid password");
          }
        } else {
          throw new Error("Please sign in with Google for this account");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          username: user.username,
        };
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // If logging in via Google, check if user exists.
      // If not, redirect them to username setup.
      if (account?.provider === "google") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });
        
        if (!existingUser) {
          const defaultUsername = user.email!.split("@")[0] + Math.floor(Math.random() * 10000);
          return `/auth/setup-username?email=${encodeURIComponent(user.email!)}&name=${encodeURIComponent(user.name || "")}&username=${encodeURIComponent(defaultUsername)}&image=${encodeURIComponent(user.image || "")}`;
        }
      }
      return true;
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) || "SUBMITTER";
        session.user.username = token.username as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

