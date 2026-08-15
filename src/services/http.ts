// Shared low-level fetch helper for every client-side service adapter in
// this directory (src/services/prospects.ts, researchShops.ts, trends.ts,
// etc.) — not a new backend, just the one place that turns a non-2xx
// response from an existing /api/* route into a typed, catchable error
// instead of every adapter repeating its own try/catch JSON parsing.

export class ServiceError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ServiceError";
    this.status = status;
  }
}

export async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    throw new ServiceError("Network error — check your connection and try again.", 0);
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // Some endpoints (e.g. a bare 204/ok) may have no body — fine as long as res.ok.
  }

  if (!res.ok) {
    const message = (body as { error?: string } | null)?.error ?? `Request failed (${res.status}).`;
    throw new ServiceError(message, res.status);
  }

  return body as T;
}
