"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/shell";
import { Card, Input, Button, Alert, Heading, Text } from "@/components/ui";
import { resolveResearchShopUrl } from "@/services/researchShops";
import { ServiceError } from "@/services/http";
import { SpyTabs } from "./spy-tabs";

export default function SpyOnCompetitorPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const { shopExternalId } = await resolveResearchShopUrl(url);
      setMessage("Found it — opening the shop profile…");
      setTimeout(() => router.push(`/shops/${shopExternalId}`), 1200);
    } catch (e) {
      setLoading(false);
      setError(e instanceof ServiceError ? e.message : "Couldn't process that URL.");
    }
  }

  return (
    <div>
      <PageHeader title="Spy on Competitor" />
      <SpyTabs active="find" />
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="w-full max-w-lg text-center">
          <Heading as="h2" size="display-sm">
            Research any competitor shop
          </Heading>
          <Text color="secondary" className="mt-2">
            Paste any Etsy shop URL to pull up its full profile and start tracking its sales over time.
          </Text>

          <Card variant="feature" padding="lg" className="mt-6 text-left">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Shop URL"
                required
                placeholder="https://www.etsy.com/shop/ShopName"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <Button type="submit" variant="primary" loading={loading} leadingIcon={<Search className="h-4 w-4" />}>
                {loading ? "Searching…" : "Start spying"}
              </Button>
              {error && <Alert variant="danger">{error}</Alert>}
              {message && <Alert variant="success">{message}</Alert>}
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
