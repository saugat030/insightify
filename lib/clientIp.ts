// Forgeable headers, trusted only because nginx sets them and Next listens on
// loopback alone. Expose Next directly and every limit is bypassable. See docs/DEPLOY.md.
export function clientIp(req: Request): string {
  const h = req.headers;

  // nginx sets this from $remote_addr once it has verified the sender is Cloudflare.
  const realIp = h.get("x-real-ip");
  if (realIp) return realIp.trim();

  // Only reached if an nginx location forgets X-Real-IP. Trustworthy because ufw
  // admits only Cloudflare, which overwrites this header.
  const cf = h.get("cf-connecting-ip");
  if (cf) return cf.trim();

  return "unknown";
}
