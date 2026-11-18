import crypto from "crypto";

const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || process.env.NEXTAUTH_SECRET || "";

export function createAdminSessionToken(
  address: string,
  ttlSeconds = 60 * 60 * 24,
) {
  const payload = {
    address: address.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  } as const;

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadStr)
    .digest("hex");

  return `${payloadStr}.${sig}`;
}

export function verifyAdminSessionToken(token?: string) {
  if (!token || !SESSION_SECRET) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadStr, sig] = parts;
  const expected = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadStr)
    .digest("hex");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig)))
      return null;
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(payloadStr, "base64url").toString("utf8"),
    );
    if (!payload?.address || !payload?.exp) return null;
    if (Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload.address as string;
  } catch {
    return null;
  }
}
