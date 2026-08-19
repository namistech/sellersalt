import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSetting } from "@/lib/app-settings";
import { PageHeader } from "@/components/shell";
import { Card, Button, Heading, Text, Badge } from "@/components/ui";
import { GraduationCap, ExternalLink, BookOpen, Video, Compass, Sparkles } from "lucide-react";

export default async function UniversityPage() {
  const session = await getServerSession(authOptions);
  const universityUrl = await getSetting("university_url");
  const isEnabled = (await getSetting("university_enabled")) === "true";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <PageHeader
        title="SellerSalt University"
        description="Master Etsy keyword intelligence, market research, and high-velocity listing strategies."
        primaryAction={
          universityUrl ? (
            <a href={universityUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="primary" className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white">
                <ExternalLink className="h-4 w-4 mr-1.5" /> Open University Portal
              </Button>
            </a>
          ) : undefined
        }
      />

      {/* Main Course Hub */}
      <Card padding="lg" className="border-line bg-white shadow-xs space-y-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-[#141B16] text-[#16C784] flex items-center justify-center font-extrabold shadow-sm shrink-0">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Heading as="h2" size="h3">
                SellerSalt Seller Acceleration Program
              </Heading>
              <Badge variant="success">Included with Plan</Badge>
            </div>
            <Text size="body-sm" color="secondary">
              Comprehensive blueprints on store scaling, high-margin category discovery, and Etsy SEO algorithms.
            </Text>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-line-subtle">
          <div className="p-4 rounded-xl bg-surface border border-line space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-ink">
              <BookOpen className="h-4 w-4 text-[#0E8F5D]" /> Module 1: Market Intelligence
            </div>
            <p className="text-xs text-ink-tertiary">
              How to identify breakout micro-niches with high sales velocity and low competition before saturated sellers enter.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-line space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-ink">
              <Compass className="h-4 w-4 text-[#0E8F5D]" /> Module 2: Market Research Tactics
            </div>
            <p className="text-xs text-ink-tertiary">
              Using periodic snapshot tracking to follow shop stock movements, price changes, and review momentum.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-line space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-ink">
              <Sparkles className="h-4 w-4 text-[#0E8F5D]" /> Module 3: Listing SEO Mastery
            </div>
            <p className="text-xs text-ink-tertiary">
              Constructing title tags, attribute hierarchies, and Jaccard-compliant tags that rank on Etsy search.
            </p>
          </div>
        </div>

        {universityUrl && (
          <div className="p-4 rounded-xl bg-[#E7FAF1] border border-[#16C784]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-[#0E8F5D]">External Learning Portal Connected</div>
              <div className="text-xs text-ink-secondary">
                Access your dedicated video modules, assignments, and cohort sessions.
              </div>
            </div>
            <a href={universityUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="primary" size="compact" className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white">
                Launch Portal <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </a>
          </div>
        )}
      </Card>
    </div>
  );
}
