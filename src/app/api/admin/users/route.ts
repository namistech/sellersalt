import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/is-admin";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
  }

  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.toLowerCase().trim() || "";

  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      memberships: {
        include: {
          organization: {
            include: {
              package: { select: { name: true, key: true } },
              subscription: { select: { status: true, provider: true } },
            },
          },
        },
      },
    },
  });

  const formatted = users.map((u) => {
    const membership = u.memberships[0];
    const primaryOrg = membership?.organization;
    const role = membership?.role || "MEMBER";
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role,
      membershipId: membership?.id ?? null,
      organizationId: primaryOrg?.id ?? null,
      organizationName: primaryOrg?.name || "No Workspace",
      planName: primaryOrg?.package?.name || "Starter",
      subscriptionStatus: primaryOrg?.subscription?.status || "INCOMPLETE",
      memberSince: u.createdAt,
      suspended: Boolean(u.suspendedAt),
    };
  });

  return NextResponse.json({ users: formatted });
}
