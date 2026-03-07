export function extractClientIp(requestHeaders: Headers) {
  const direct =
    requestHeaders.get("cf-connecting-ip") ||
    requestHeaders.get("x-real-ip") ||
    requestHeaders.get("x-client-ip");

  if (direct) {
    return direct.trim().slice(0, 80);
  }

  const forwarded = requestHeaders.get("x-forwarded-for");
  if (!forwarded) {
    return null;
  }

  const first = forwarded.split(",")[0]?.trim();
  return first ? first.slice(0, 80) : null;
}
