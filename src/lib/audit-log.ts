import { prisma } from "./db";

export type AuditEvent =
  | "EMAIL_VERIFICATION_SENT"
  | "EMAIL_VERIFICATION_RESENT"
  | "ADMIN_EMAIL_VERIFICATION_SENT"
  | "ADMIN_VERIFICATION_EMAIL_SENT"
  | "ADMIN_EMAIL_CHANGED"
  | "ADMIN_USER_CREATED"
  | "ADMIN_PACKAGE_UPDATED"
  | "ADMIN_PACKAGE_DELETED"
  | "EMAIL_VERIFIED";

interface AuditActor {
  id?: string | null;
  email?: string | null;
}

interface AuditTarget {
  id?: string | null;
  email?: string | null;
}

// Never pass tokens, passwords, or provider secrets in `metadata` — this
// table has no purpose beyond a human-readable "who did what to whom, when"
// trail. Failures here must never take down the caller's actual operation.
export async function logAuditEvent(params: {
  event: AuditEvent;
  actor?: AuditActor;
  target?: AuditTarget;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        event: params.event,
        actorId: params.actor?.id ?? null,
        actorEmail: params.actor?.email ?? null,
        targetId: params.target?.id ?? null,
        targetEmail: params.target?.email ?? null,
        metadata: params.metadata ? (params.metadata as any) : undefined,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log event", params.event, err);
  }
}
