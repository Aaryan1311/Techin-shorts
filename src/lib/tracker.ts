/**
 * Client-side behavioral tracking utility.
 * Sends events to POST /api/track. Fire-and-forget — never throws.
 */

type BehaviorType =
  | "VIEW"
  | "READ_SUMMARY"
  | "CLICK_DETAIL"
  | "CLICK_FUTURE"
  | "CLICK_BUILD"
  | "READ_DETAIL"
  | "SHARE";

const sent = new Set<string>();

export function trackEvent(
  newsId: string,
  type: BehaviorType,
  durationSeconds?: number
) {
  // Deduplicate VIEW on client side within session
  if (type === "VIEW") {
    const key = `VIEW:${newsId}`;
    if (sent.has(key)) return;
    sent.add(key);
  }

  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newsId, type, durationSeconds }),
  }).catch(() => {
    // silent — tracking should never disrupt UX
  });
}
