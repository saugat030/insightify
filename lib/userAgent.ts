// Turns a raw User-Agent into something a person can recognise on the sessions
// screen. Deliberately crude — enough to tell your phone from your laptop, not
// a device fingerprint.
export function describeUserAgent(ua: string): string {
  if (!ua) return "Unknown device";

  const browser =
    /\bEdg\//.test(ua) ? "Edge"
    : /\bOPR\/|\bOpera\b/.test(ua) ? "Opera"
    : /\bFirefox\//.test(ua) ? "Firefox"
    : /\bChrome\//.test(ua) ? "Chrome"
    : /\bSafari\//.test(ua) ? "Safari"
    : null;

  const os =
    /\bWindows\b/.test(ua) ? "Windows"
    : /\bAndroid\b/.test(ua) ? "Android"
    : /\b(iPhone|iPad|iPod)\b/.test(ua) ? "iOS"
    : /\bMac OS X\b|\bMacintosh\b/.test(ua) ? "macOS"
    : /\bLinux\b/.test(ua) ? "Linux"
    : null;

  if (browser && os) return `${browser} on ${os}`;
  return browser ?? os ?? "Unknown device";
}
