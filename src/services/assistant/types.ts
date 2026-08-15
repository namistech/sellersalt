export type AssistantIntentType =
  | "TOP_OPPORTUNITIES"
  | "FASTEST_GROWING_COMPETITORS"
  | "DAILY_RESEARCH_AGENDA"
  | "LOW_COMPETITION_NICHES"
  | "SAVED_OPPORTUNITIES"
  | "TRACKED_COMPETITORS"
  | "TRIGGER_SEARCH"
  | "WHAT_CHANGED_SINCE_YESTERDAY"
  | "HELP"
  | "UNKNOWN";

export interface AssistantAction {
  label: string;
  href?: string;
  actionKey?: string;
  variant?: "primary" | "secondary" | "outline";
}

export interface AssistantCardItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: { label: string; variant: "success" | "warn" | "accent" | "neutral" };
  metrics?: Array<{ label: string; value: string | number }>;
  href?: string;
  imageUrl?: string;
}

export interface AssistantMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  intent?: AssistantIntentType;
  timestamp: string;
  cards?: AssistantCardItem[];
  actions?: AssistantAction[];
  isDeterministic?: boolean;
}

export interface AssistantQueryRequest {
  query: string;
  history?: Array<{ sender: "user" | "assistant"; text: string }>;
}

export interface AssistantQueryResponse {
  message: AssistantMessage;
}
