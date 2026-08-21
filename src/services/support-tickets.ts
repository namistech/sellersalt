// Customer Support Tickets Service

export type TicketCategory =
  | "BILLING"
  | "ETSY_API"
  | "MARKET_RESEARCH"
  | "BUG_REPORT"
  | "FEATURE_QUESTION"
  | "GENERAL";

export type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_ON_CUSTOMER"
  | "RESOLVED"
  | "CLOSED";

export interface TicketReply {
  id: string;
  ticketId: string;
  authorName: string;
  isStaff: boolean;
  message: string;
  createdAt: string;
}

export interface SupportTicketItem {
  id: string;
  organizationId: string;
  userId: string;
  authorName: string;
  subject: string;
  message: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  replies: TicketReply[];
  createdAt: string;
  updatedAt: string;
}

// Memory store for support tickets
let TICKETS_STORE: SupportTicketItem[] = [
  {
    id: "tkt-101",
    organizationId: "system",
    userId: "system",
    authorName: "SellerSalt Support",
    subject: "Welcome to SellerSalt Customer Support",
    message: "If you have any questions regarding Etsy connector syncing, market research snapshots, or plan quotas, our engineering team is here to assist.",
    category: "GENERAL",
    priority: "NORMAL",
    status: "RESOLVED",
    replies: [
      {
        id: "rep-1",
        ticketId: "tkt-101",
        authorName: "SellerSalt Technical Team",
        isStaff: true,
        message: "You can open a support ticket anytime and our staff will respond within 4 business hours.",
        createdAt: "2026-08-16T12:00:00.000Z",
      },
    ],
    createdAt: "2026-08-16T10:00:00.000Z",
    updatedAt: "2026-08-16T12:00:00.000Z",
  },
];

export async function getSupportTickets(organizationId: string): Promise<SupportTicketItem[]> {
  return TICKETS_STORE.filter(
    (t) => t.organizationId === organizationId || t.organizationId === "system"
  ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getSupportTicketById(
  id: string,
  organizationId: string
): Promise<SupportTicketItem | null> {
  const ticket = TICKETS_STORE.find(
    (t) => t.id === id && (t.organizationId === organizationId || t.organizationId === "system")
  );
  return ticket || null;
}

export async function createSupportTicket(params: {
  organizationId: string;
  userId: string;
  authorName: string;
  subject: string;
  message: string;
  category: TicketCategory;
  priority?: TicketPriority;
}): Promise<SupportTicketItem> {
  const newTicket: SupportTicketItem = {
    id: `tkt-${Date.now()}`,
    organizationId: params.organizationId,
    userId: params.userId,
    authorName: params.authorName,
    subject: params.subject.trim(),
    message: params.message.trim(),
    category: params.category,
    priority: params.priority || "NORMAL",
    status: "OPEN",
    replies: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  TICKETS_STORE.unshift(newTicket);
  return newTicket;
}

export async function addTicketReply(params: {
  ticketId: string;
  organizationId: string;
  authorName: string;
  isStaff: boolean;
  message: string;
}): Promise<TicketReply> {
  const ticket = await getSupportTicketById(params.ticketId, params.organizationId);
  if (!ticket) throw new Error("Support ticket not found.");

  const newReply: TicketReply = {
    id: `rep-${Date.now()}`,
    ticketId: params.ticketId,
    authorName: params.authorName,
    isStaff: params.isStaff,
    message: params.message.trim(),
    createdAt: new Date().toISOString(),
  };

  ticket.replies.push(newReply);
  ticket.updatedAt = new Date().toISOString();
  if (!params.isStaff && ticket.status === "RESOLVED") {
    ticket.status = "OPEN";
  }

  return newReply;
}
