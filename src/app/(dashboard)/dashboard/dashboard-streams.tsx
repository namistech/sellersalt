"use client";

import { useState } from "react";
import Link from "next/link";
import { Radar, ArrowRight, Clock, Play } from "lucide-react";
import { Card, Button, Badge, Heading, Text } from "@/components/ui";
import { EmptyState, formatRelativeTime } from "@/components/data";
import { scheduleFrequencyFromCron, SCHEDULE_FREQUENCY_LABELS } from "@/services/searchConfigs";
import { runSearch } from "@/services/jobs";
import type { DashboardSearchStreamItem, DashboardRecentRunItem } from "@/services/dashboard";

interface DashboardStreamsProps {
  streams: DashboardSearchStreamItem[];
  recentRuns: DashboardRecentRunItem[];
  onNewSearch: () => void;
}

export function DashboardStreams({ streams, recentRuns, onNewSearch }: DashboardStreamsProps) {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [ranSuccess, setRanSuccess] = useState<string | null>(null);

  async function handleRun(id: string) {
    setRunningId(id);
    try {
      await runSearch(id);
      setRanSuccess(id);
      setTimeout(() => setRanSuccess(null), 3000);
    } catch {
      // Ignored - background queue
    } finally {
      setRunningId(null);
    }
  }

  return (
    <Card padding="lg" className="flex flex-col justify-between">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heading as="h2" size="h4">
              Active Search Streams
            </Heading>
            <Badge variant="neutral">{streams.length} active</Badge>
          </div>
          <Link
            href="/prospects?tab=saved"
            className="inline-flex items-center gap-1 text-body-sm font-medium text-accent hover:underline"
          >
            Manage searches <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        {streams.length === 0 ? (
          <div className="py-6">
            <EmptyState
              icon={<Radar />}
              title="No active research streams"
              description="Save a keyword query to start recurring market surveillance."
              action={
                <Button variant="primary" size="compact" onClick={onNewSearch}>
                  Create search stream
                </Button>
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-line-subtle">
            {streams.map((stream) => {
              const freq = scheduleFrequencyFromCron(stream.scheduleCron);
              const label = SCHEDULE_FREQUENCY_LABELS[freq];
              const isAuto = freq !== "MANUAL";
              const isRunning = runningId === stream.id;
              const justTriggered = ranSuccess === stream.id;

              return (
                <div key={stream.id} className="flex flex-col gap-2.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Text as="span" size="body-sm" weight="semibold" className="text-ink truncate">
                        {stream.name}
                      </Text>
                      <Badge variant={isAuto ? "success" : "neutral"} className="text-xs">
                        {label}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-meta text-ink-tertiary">
                      <span>
                        Keywords: <span className="text-ink-secondary">{stream.keywords.slice(0, 3).join(", ")}</span>
                      </span>
                      <span>·</span>
                      <span>
                        Yield: <strong className="text-ink">{stream.prospectCount}</strong> prospects
                      </span>
                      {stream.lastRunAt && (
                        <>
                          <span>·</span>
                          <span>Last run {formatRelativeTime(stream.lastRunAt)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 self-end sm:self-center">
                    <Button
                      variant={justTriggered ? "secondary" : "secondary"}
                      size="compact"
                      loading={isRunning}
                      disabled={justTriggered}
                      leadingIcon={!isRunning && <Play className="h-3 w-3 fill-current" />}
                      onClick={() => handleRun(stream.id)}
                    >
                      {justTriggered ? "Queued!" : "Run now"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {recentRuns.length > 0 && (
          <div className="mt-5 pt-4 border-t border-line-subtle">
            <Text as="div" size="label-sm" color="secondary" className="uppercase tracking-wider mb-2">
              Recent Yield Activity
            </Text>
            <div className="flex flex-col gap-1.5">
              {recentRuns.slice(0, 3).map((run) => (
                <div key={run.id} className="flex items-center justify-between text-body-sm py-1">
                  <span className="flex items-center gap-2 truncate text-ink">
                    <Clock className="h-3.5 w-3.5 text-ink-tertiary shrink-0" />
                    <span className="font-medium truncate">{run.searchConfigName}</span>
                  </span>
                  <span className="text-meta text-ink-tertiary shrink-0 font-medium">
                    {run.resultCount != null ? `+${run.resultCount} prospects` : "In progress"} · {formatRelativeTime(run.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-line-subtle flex items-center justify-between text-meta text-ink-tertiary">
        <span>Runs execute via scheduled background workers</span>
        <Link href="/jobs" className="text-accent hover:underline">
          Full execution log →
        </Link>
      </div>
    </Card>
  );
}
