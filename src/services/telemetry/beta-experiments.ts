/**
 * SellerSalt Beta Experiment Framework
 * 
 * Provides deterministic variant assignment and hypothesis tracking for closed beta cohorts.
 * 
 * Invariant: Never declares an experiment "SUPPORTED" without sufficient empirical sample size.
 */

export interface BetaExperiment {
  id: string;
  hypothesis: string;
  targetWorkflow: "DISCOVER" | "RESEARCH" | "VALIDATE" | "PLAN" | "LAUNCH" | "BILLING";
  variants: ["CONTROL", "TREATMENT"];
  startDate: Date;
  endDate?: Date;
  status: "ACTIVE" | "CONCLUDED";
  sampleSizeRequired: number;
  observedSampleSize: number;
  outcome: "SUPPORTED" | "NOT_SUPPORTED" | "INCONCLUSIVE";
}

// Canonical Private Beta Experiments
const ACTIVE_EXPERIMENTS: BetaExperiment[] = [
  {
    id: "exp_data_trust_prominence",
    hypothesis: "Displaying transparent Data Trust scores prominently increases research completion rate.",
    targetWorkflow: "RESEARCH",
    variants: ["CONTROL", "TREATMENT"],
    startDate: new Date("2026-08-20"),
    status: "ACTIVE",
    sampleSizeRequired: 50,
    observedSampleSize: 0,
    outcome: "INCONCLUSIVE",
  },
  {
    id: "exp_unit_econ_sensitivity_default",
    hypothesis: "Providing default Conservative / Base / Optimistic cost presets increases workspace creation.",
    targetWorkflow: "PLAN",
    variants: ["CONTROL", "TREATMENT"],
    startDate: new Date("2026-08-20"),
    status: "ACTIVE",
    sampleSizeRequired: 30,
    observedSampleSize: 0,
    outcome: "INCONCLUSIVE",
  },
];

export class BetaExperimentManager {
  /**
   * Deterministically assigns an organization to an experiment variant via hash modulo.
   */
  public static getVariant(experimentId: string, organizationId: string): "CONTROL" | "TREATMENT" {
    const exp = ACTIVE_EXPERIMENTS.find((e) => e.id === experimentId);
    if (!exp) return "CONTROL";

    // Simple deterministic string hash
    let hash = 0;
    const combined = `${experimentId}:${organizationId}`;
    for (let i = 0; i < combined.length; i++) {
      hash = (hash << 5) - hash + combined.charCodeAt(i);
      hash |= 0;
    }

    return Math.abs(hash) % 2 === 0 ? "CONTROL" : "TREATMENT";
  }

  /**
   * Retrieves all active and concluded beta experiments.
   */
  public static listExperiments(): BetaExperiment[] {
    return [...ACTIVE_EXPERIMENTS];
  }
}
