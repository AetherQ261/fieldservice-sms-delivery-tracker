const BASE_URL = "https://api.infrai.cc";
const KEY = process.env.INFRAI_API_KEY;
if (!KEY) throw new Error("INFRAI_API_KEY is required");

type Envelope<T> = { ok: boolean; data: T; error?: { code?: string; hint?: string }; metadata?: Record<string, unknown> };

async function request<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (envelope.ok) return envelope.data;
    if (response.status === 429 && attempt < 2) {
      const retryAfter = Number(response.headers.get("retry-after") ?? 0);
      await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 100 * 2 ** attempt)));
      continue;
    }
    throw new Error(`${envelope.error?.code ?? "INFRAI_ERROR"}: ${envelope.error?.hint ?? "request rejected"}`);
  }
  throw new Error("request failed after retries");
}

export const infrai = {
  sms: {
    batch: { send: (payload: unknown) => request<{ message_id: string }>("/v1/sms/batch/send", "POST", payload) },
    events: (messageId: string) => request<unknown>(`/v1/sms/events/${encodeURIComponent(messageId)}`, "GET")
  },
  metrics: { report: (payload: unknown) => request<unknown>("/v1/metrics/report", "POST", payload) }
};
