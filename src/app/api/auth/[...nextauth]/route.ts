import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import type { NextRequest } from "next/server";

async function auth(req: NextRequest, ctx: any) {
  const options = await getAuthOptions();
  return NextAuth(req, ctx, options);
}

export { auth as GET, auth as POST };
