/**
 * SellerSalt — Canonical Signal Classification Contract
 * 
 * Enforces rigorous provenance, data transparency, and methodology disclosure
 * for every single metric displayed across SellerSalt intelligence surfaces.
 */

import type { DataSourceType } from "../types";

/**
 * Fundamental epistemological classification of any intelligence metric.
 */
export type SignalClassification =
  | "OBSERVED"      // Directly captured from live public marketplace listing or official API payload
  | "DERIVED"       // Deterministically calculated from observed signals (e.g. median P50, attribute %)
  | "ESTIMATED"     // Statistical models or algorithmic estimations (e.g. confidence scoring, momentum)
  | "USER_DERIVED"  // User-entered inputs and financial sensitivity calculations (e.g. landed cost, target CAC)
  | "UNAVAILABLE";  // Metric cannot be observed legitimately (e.g. private monthly search volume, store revenue)

export interface ClassifiedSignal<T = any> {
  readonly name: string;
  readonly value: T | null;
  readonly classification: SignalClassification;
  readonly source: DataSourceType | "USER_INPUT" | "NONE";
  readonly confidence: number; // 0 to 100
  readonly isAvailable: boolean;
  readonly methodology?: string;
  readonly limitations?: string;
  readonly explanation?: string;
  readonly evaluatedAt: Date;
}

export class SignalClassifier {
  /**
   * Constructs a strictly typed, provenance-backed ClassifiedSignal.
   */
  public static classify<T>(params: {
    name: string;
    value: T | null | undefined;
    classification: SignalClassification;
    source?: DataSourceType | "USER_INPUT" | "NONE";
    confidence?: number;
    methodology?: string;
    limitations?: string;
    explanation?: string;
  }): ClassifiedSignal<T> {
    const isAvailable = params.value !== null && params.value !== undefined && params.classification !== "UNAVAILABLE";
    
    return {
      name: params.name,
      value: isAvailable ? (params.value as T) : null,
      classification: isAvailable ? params.classification : "UNAVAILABLE",
      source: params.source || (isAvailable ? "PUBLIC_WEB" : "NONE"),
      confidence: isAvailable ? (params.confidence ?? 80) : 0,
      isAvailable,
      methodology: params.methodology,
      limitations: params.limitations,
      explanation: params.explanation || (isAvailable ? undefined : `Metric '${params.name}' is unavailable from legitimate public sources.`),
      evaluatedAt: new Date(),
    };
  }

  /**
   * Helper specifically for metrics known to be unavailable from public research (e.g. Search Volume, Private Store Revenue).
   */
  public static unavailable<T = null>(
    name: string,
    reason: string
  ): ClassifiedSignal<T> {
    return {
      name,
      value: null,
      classification: "UNAVAILABLE",
      source: "NONE",
      confidence: 0,
      isAvailable: false,
      explanation: reason,
      limitations: "SellerSalt does not fabricate synthetic proxies for private data (Zero-Fabrication Guarantee).",
      evaluatedAt: new Date(),
    };
  }
}
