import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const PLANS = [
  { id: "FREE", name: "Free", price: "$0", blurb: "1 connector, manual runs, 200 prospects/mo." },
  { id: "PRO", name: "Pro", price: "$49/mo", blurb: "Unlimited connectors, scheduled runs, unlimited prospects." },
  { id: "AGENCY", name: "Agency", price: "$199/mo", blurb: "Multiple workspaces, team seats, priority support." },
];

export default async function BillingPage() {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  const org = organizationId
    ? await prisma.organization.findUnique({ where: { id: organizationId } })
    : null;

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Billing</h1>
        <p className="mt-1 text-sm text-muted">
          Payment processing isn't wired up yet — this is the plan-selection UI, ready for
          Stripe once you're taking payments.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = org?.plan === plan.id;
          return (
            <div key={plan.id} className={`card ${isCurrent ? "border-accent" : ""}`}>
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink">{plan.name}</h2>
                {isCurrent && <span className="badge bg-accent-soft text-accent-dark">Current</span>}
              </div>
              <div className="mb-3 text-2xl font-semibold text-ink">{plan.price}</div>
              <p className="mb-4 text-sm text-muted">{plan.blurb}</p>
              <button className="btn-secondary w-full" disabled title="Stripe integration pending">
                {isCurrent ? "Current plan" : "Upgrade — coming soon"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
