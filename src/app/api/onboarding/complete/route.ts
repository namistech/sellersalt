import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const CATEGORY_MAX_LEN = 100;
const NICHE_MAX_LEN = 200;
const GOAL_MAX_LEN = 50;

/** The single real write path for onboarding activation state. Persists to
 * User, not localStorage — a client-side value can't be trusted as a
 * server-side business fact (see dashboard-onboarding-guide.tsx, which
 * reads these fields, never localStorage, for the same reason). */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const category = typeof body.category === "string" ? body.category.trim().slice(0, CATEGORY_MAX_LEN) : null;
  const niche = typeof body.niche === "string" ? body.niche.trim().slice(0, NICHE_MAX_LEN) : null;
  const goal = typeof body.goal === "string" ? body.goal.trim().slice(0, GOAL_MAX_LEN) : null;

  if (!category || !goal) {
    return NextResponse.json({ error: "category and goal are required to complete onboarding." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      onboardingCompletedAt: new Date(),
      onboardingCategory: category,
      onboardingNiche: niche,
      onboardingGoal: goal,
    },
    select: {
      onboardingCompletedAt: true,
      onboardingCategory: true,
      onboardingNiche: true,
      onboardingGoal: true,
    },
  });

  return NextResponse.json({ success: true, onboarding: user });
}
