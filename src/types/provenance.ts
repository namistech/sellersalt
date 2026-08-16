/**
 * SellerSalt Data Provenance Classification System
 * 
 * Strict data classification standard for maintaining engineering integrity
 * and regulatory compliance. Never present derived or external data as native Etsy data.
 */

export type DataProvenanceType =
  | "ACTUAL_ETSY_DATA"
  | "ESTIMATED"
  | "SELLERSALT_SCORE"
  | "EXTERNAL_DATA";

export interface DataProvenanceMeta {
  type: DataProvenanceType;
  label: string;
  badgeText: string;
  description: string;
  variant: "success" | "info" | "gold" | "neutral";
}

export const DATA_PROVENANCE_REGISTRY: Record<DataProvenanceType, DataProvenanceMeta> = {
  ACTUAL_ETSY_DATA: {
    type: "ACTUAL_ETSY_DATA",
    label: "Actual Etsy Data",
    badgeText: "[ACTUAL ETSY DATA]",
    description: "Returned directly and verbatim by Etsy Open API v3.",
    variant: "success",
  },
  ESTIMATED: {
    type: "ESTIMATED",
    label: "Estimated Metric",
    badgeText: "[ESTIMATED]",
    description: "Calculated mathematically from actual Etsy data using transparent, deterministic formulas.",
    variant: "info",
  },
  SELLERSALT_SCORE: {
    type: "SELLERSALT_SCORE",
    label: "SellerSalt Score",
    badgeText: "[SELLERSALT SCORE]",
    description: "Proprietary heuristic evaluation and diagnostic scoring model by SellerSalt.",
    variant: "gold",
  },
  EXTERNAL_DATA: {
    type: "EXTERNAL_DATA",
    label: "External Data",
    badgeText: "[EXTERNAL DATA]",
    description: "Sourced from non-Etsy third-party providers or search engine indexes.",
    variant: "neutral",
  },
};

export function getProvenanceMeta(type: DataProvenanceType): DataProvenanceMeta {
  return DATA_PROVENANCE_REGISTRY[type] ?? DATA_PROVENANCE_REGISTRY.SELLERSALT_SCORE;
}
