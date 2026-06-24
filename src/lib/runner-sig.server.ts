import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify HMAC-SHA256 signature on a raw request body.
 * Expected header: x-runner-signature: t=<unix-seconds>,v1=<hex>
 * The signed string is `${t}.${body}` with the RUNNER_SECRET as the key.
 * Window: 5 minutes to mitigate replay attacks.
 */
export function verifyRunnerSignature(rawBody: string, signatureHeader: string | null, secret: string): { ok: true } | { ok: false; reason: string } {
  if (!signatureHeader) return { ok: false, reason: "missing signature header" };
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((s) => s.trim().split("=") as [string, string]),
  );
  const t = Number(parts.t);
  const v1 = parts.v1;
  if (!t || !v1) return { ok: false, reason: "malformed signature" };
  if (Math.abs(Date.now() / 1000 - t) > 300) return { ok: false, reason: "stale signature" };

  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(v1);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: "bad signature" };
  return { ok: true };
}
