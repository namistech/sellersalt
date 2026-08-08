// Anadash's own competition-difficulty heuristic — not an Etsy metric, not an
// industry-standard benchmark. Thresholds are editorial judgment calls meant to
// give a quick "should a newcomer bother competing with this shop" read. Green =
// weaker/newer competitor (opportunity), red = established/strong competitor
// (avoid). Easy to retune later — all thresholds live in one place.

export type ScoreLevel = "easy" | "moderate" | "hard";

interface LevelMeta {
  label: string;
  bg: string;
  text: string;
  ring: string;
}

const LEVEL_META: Record<ScoreLevel, LevelMeta> = {
  easy: {
    label: "Easy to compete",
    bg: "bg-green-50 dark:bg-green-950/40",
    text: "text-green-700 dark:text-green-400",
    ring: "ring-1 ring-inset ring-green-200 dark:ring-green-900",
  },
  moderate: {
    label: "Moderate competition",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    ring: "ring-1 ring-inset ring-amber-200 dark:ring-amber-900",
  },
  hard: {
    label: "Do not start (Recommended)",
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-400",
    ring: "ring-1 ring-inset ring-red-200 dark:ring-red-900",
  },
};

export function levelMeta(level: ScoreLevel): LevelMeta {
  return LEVEL_META[level];
}

function fromThresholds(value: number, easyMax: number, moderateMax: number): ScoreLevel {
  if (value <= easyMax) return "easy";
  if (value <= moderateMax) return "moderate";
  return "hard";
}

export const scoreShopAgeMonths = (v: number) => fromThresholds(v, 24, 48);
export const scoreTotalSales = (v: number) => fromThresholds(v, 500, 3000);
export const scoreReviewCount = (v: number) => fromThresholds(v, 100, 500);
export const scoreEstDailySales = (v: number) => fromThresholds(v, 1, 5);
export const scoreSellThrough = (v: number) => fromThresholds(v, 5, 20);
export const scoreActiveListings = (v: number) => fromThresholds(v, 20, 100);
export const scoreFavorites = (v: number) => fromThresholds(v, 200, 2000);

const LEVEL_SCORE: Record<ScoreLevel, number> = { easy: 0, moderate: 1, hard: 2 };

export function overallCompetitionRating(levels: ScoreLevel[]): ScoreLevel {
  if (levels.length === 0) return "moderate";
  const avg = levels.reduce((sum, l) => sum + LEVEL_SCORE[l], 0) / levels.length;
  if (avg < 0.75) return "easy";
  if (avg < 1.5) return "moderate";
  return "hard";
}
