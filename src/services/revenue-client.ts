import axios from "axios";
import type {
  ProfitWaterfall,
  ListingYieldMetric,
  ProfitCalculatorInput,
  ProfitCalculatorResult,
  FinancialCostAssumption,
  FinancialInsight,
} from "@/types/revenue";

export async function fetchRevenueAnalytics(params?: {
  period?: string;
  channelId?: string;
  currency?: string;
}): Promise<{
  success: boolean;
  hasConnectedChannels: boolean;
  channels: any[];
  activeCurrency: string;
  availableCurrencies: string[];
  waterfall: ProfitWaterfall;
  timeSeries: Array<{ date: string; revenue: number; orders: number; profit: number }>;
  insights: FinancialInsight[];
}> {
  const res = await axios.get("/api/analytics/revenue", { params });
  return res.data;
}

export async function fetchListingYieldAnalytics(params?: {
  period?: string;
  channelId?: string;
  currency?: string;
}): Promise<{ success: boolean; listings: ListingYieldMetric[] }> {
  const res = await axios.get("/api/analytics/listings", { params });
  return res.data;
}

export async function calculateProfitSimulation(
  input: ProfitCalculatorInput
): Promise<{ success: boolean; result: ProfitCalculatorResult }> {
  const res = await axios.post("/api/analytics/calculator", input);
  return res.data;
}

export async function fetchCostAssumptions(): Promise<{
  success: boolean;
  assumptions: FinancialCostAssumption;
}> {
  const res = await axios.get("/api/analytics/assumptions");
  return res.data;
}

export async function updateCostAssumptions(
  assumptions: Partial<FinancialCostAssumption>
): Promise<{ success: boolean; assumptions: FinancialCostAssumption; message: string }> {
  const res = await axios.post("/api/analytics/assumptions", assumptions);
  return res.data;
}
