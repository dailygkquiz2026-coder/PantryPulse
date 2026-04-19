// Decode JWT payload without verifying signature (signature is verified by Identity Toolkit).
function decodeTokenPayload(idToken: string): Record<string, any> | null {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function verifyToken(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const idToken = authHeader.slice(7);

  // Fast-path expiry check before hitting the network.
  const payload = decodeTokenPayload(idToken);
  if (!payload) return null;
  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && payload.exp < nowSec) return null;
  if (typeof payload.iat === 'number' && payload.iat > nowSec + 60) return null; // clock skew guard

  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) throw new Error('Server misconfigured: FIREBASE_WEB_API_KEY not set');

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json() as any;
  return data.users?.[0]?.localId ?? null;
}

// In-memory per-user rate limiter (per serverless instance).
// Limits are intentionally conservative for expensive AI endpoints.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  uid: string,
  opts: { maxRequests?: number; windowMs?: number } = {}
): boolean {
  const { maxRequests = 20, windowMs = 60_000 } = opts;
  const now = Date.now();
  const entry = rateLimitMap.get(uid);
  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(uid, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}
